import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.resolve('data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const TABLES_FILE = path.join(DATA_DIR, 'reference_tables.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Authentication middleware helper
function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role] = decoded.split(':');
    const users = readJsonFile<any[]>(USERS_FILE, []);
    const user = users.find(u => u.id === userId && u.role === role);
    return user || null;
  } catch {
    return null;
  }
}

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const users = readJsonFile<any[]>(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password);

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // Update lastLogin
  user.lastLogin = new Date().toISOString();
  writeJsonFile(USERS_FILE, users);

  const token = Buffer.from(`${user.id}:${user.role}:${Date.now()}`).toString('base64');
  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };

  res.json({ token, user: safeUser });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
  res.json({ user: safeUser });
});

// Users management routes
app.get('/api/users', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  const users = readJsonFile<any[]>(USERS_FILE, []);
  const safeUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    email: u.email,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin
  }));
  res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }

  const { username, password, name, role, email } = req.body;
  if (!username || !password || !name) {
    res.status(400).json({ error: 'Username, password, and name are required' });
    return;
  }

  const users = readJsonFile<any[]>(USERS_FILE, []);
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
    res.status(400).json({ error: 'Username already exists' });
    return;
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    username: username.trim(),
    password,
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'viewer',
    email: email ? email.trim() : '',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJsonFile(USERS_FILE, users);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email,
    createdAt: newUser.createdAt
  });
});

app.delete('/api/users/:id', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }

  const { id } = req.params;
  if (id === currentUser.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  let users = readJsonFile<any[]>(USERS_FILE, []);
  users = users.filter(u => u.id !== id);
  writeJsonFile(USERS_FILE, users);
  res.json({ success: true, message: 'User deleted' });
});

// Records routes
app.get('/api/records', (req, res) => {
  const records = readJsonFile<any[]>(RECORDS_FILE, []);
  res.json(records);
});

function getNextIncidentId(records: any[]): string {
  let maxNum = 0;
  for (const r of records) {
    if (r.id && r.id.startsWith('2026-')) {
      const numPart = parseInt(r.id.replace('2026-', ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `2026-${String(nextNum).padStart(6, '0')}`;
}

app.post('/api/records', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required to add records' });
    return;
  }

  const records = readJsonFile<any[]>(RECORDS_FILE, []);
  const body = req.body;

  const newId = body.id && body.id.trim() ? body.id.trim() : getNextIncidentId(records);
  if (records.some(r => r.id === newId)) {
    res.status(400).json({ error: `Incident ID ${newId} already exists` });
    return;
  }

  const newRecord = {
    id: newId,
    substation: body.substation || '',
    feeder: body.feeder || '',
    dateOfInterruption: body.dateOfInterruption || '',
    affectedArea: body.affectedArea || '',
    poleId: body.poleId || '',
    startTime: body.startTime || '',
    restoredDate: body.restoredDate || null,
    restoredTime: body.restoredTime || null,
    actionTaken: body.actionTaken || '',
    durationMinutes: body.durationMinutes !== undefined && body.durationMinutes !== null && body.durationMinutes !== '' ? Number(body.durationMinutes) : null,
    affectedConsumers: body.affectedConsumers !== undefined && body.affectedConsumers !== null && body.affectedConsumers !== '' ? Number(body.affectedConsumers) : 0,
    causeCode: body.causeCode || '',
    weatherCode: body.weatherCode || '',
    isolationDeviceCode: body.isolationDeviceCode || '',
    equipmentFailedCode: body.equipmentFailedCode || '',
    remarks: body.remarks || '',
    estimatedKwHrLoss: body.estimatedKwHrLoss !== undefined && body.estimatedKwHrLoss !== null && body.estimatedKwHrLoss !== '' ? Number(body.estimatedKwHrLoss) : null,
    estimatedRevenueLoss: body.estimatedRevenueLoss !== undefined && body.estimatedRevenueLoss !== null && body.estimatedRevenueLoss !== '' ? Number(body.estimatedRevenueLoss) : null,
    interruptionType: body.interruptionType || 'Lateral',
    status: body.status || (body.restoredDate ? 'Resolve' : 'Active'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  records.unshift(newRecord);
  writeJsonFile(RECORDS_FILE, records);
  res.status(201).json(newRecord);
});

app.put('/api/records/:id', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required to edit records' });
    return;
  }

  const { id } = req.params;
  const records = readJsonFile<any[]>(RECORDS_FILE, []);
  const index = records.findIndex(r => r.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const body = req.body;
  records[index] = {
    ...records[index],
    substation: body.substation !== undefined ? body.substation : records[index].substation,
    feeder: body.feeder !== undefined ? body.feeder : records[index].feeder,
    dateOfInterruption: body.dateOfInterruption !== undefined ? body.dateOfInterruption : records[index].dateOfInterruption,
    affectedArea: body.affectedArea !== undefined ? body.affectedArea : records[index].affectedArea,
    poleId: body.poleId !== undefined ? body.poleId : records[index].poleId,
    startTime: body.startTime !== undefined ? body.startTime : records[index].startTime,
    restoredDate: body.restoredDate !== undefined ? (body.restoredDate || null) : records[index].restoredDate,
    restoredTime: body.restoredTime !== undefined ? (body.restoredTime || null) : records[index].restoredTime,
    actionTaken: body.actionTaken !== undefined ? body.actionTaken : records[index].actionTaken,
    durationMinutes: body.durationMinutes !== undefined ? (body.durationMinutes !== null && body.durationMinutes !== '' ? Number(body.durationMinutes) : null) : records[index].durationMinutes,
    affectedConsumers: body.affectedConsumers !== undefined ? (body.affectedConsumers !== null && body.affectedConsumers !== '' ? Number(body.affectedConsumers) : 0) : records[index].affectedConsumers,
    causeCode: body.causeCode !== undefined ? body.causeCode : records[index].causeCode,
    weatherCode: body.weatherCode !== undefined ? body.weatherCode : records[index].weatherCode,
    isolationDeviceCode: body.isolationDeviceCode !== undefined ? body.isolationDeviceCode : records[index].isolationDeviceCode,
    equipmentFailedCode: body.equipmentFailedCode !== undefined ? body.equipmentFailedCode : records[index].equipmentFailedCode,
    remarks: body.remarks !== undefined ? body.remarks : records[index].remarks,
    estimatedKwHrLoss: body.estimatedKwHrLoss !== undefined ? (body.estimatedKwHrLoss !== null && body.estimatedKwHrLoss !== '' ? Number(body.estimatedKwHrLoss) : null) : records[index].estimatedKwHrLoss,
    estimatedRevenueLoss: body.estimatedRevenueLoss !== undefined ? (body.estimatedRevenueLoss !== null && body.estimatedRevenueLoss !== '' ? Number(body.estimatedRevenueLoss) : null) : records[index].estimatedRevenueLoss,
    interruptionType: body.interruptionType !== undefined ? body.interruptionType : records[index].interruptionType,
    status: body.status !== undefined ? body.status : records[index].status,
    updatedAt: new Date().toISOString()
  };

  writeJsonFile(RECORDS_FILE, records);
  res.json(records[index]);
});

app.delete('/api/records/:id', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required to delete records' });
    return;
  }

  const { id } = req.params;
  let records = readJsonFile<any[]>(RECORDS_FILE, []);
  const initialLen = records.length;
  records = records.filter(r => r.id !== id);

  if (records.length === initialLen) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  writeJsonFile(RECORDS_FILE, records);
  res.json({ success: true, message: `Record ${id} deleted` });
});

// Mark as restored endpoint
app.post('/api/records/restore/:id', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required' });
    return;
  }

  const { id } = req.params;
  const { restoredDate, restoredTime, actionTaken, durationMinutes, estimatedKwHrLoss, estimatedRevenueLoss } = req.body;
  const records = readJsonFile<any[]>(RECORDS_FILE, []);
  const index = records.findIndex(r => r.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  records[index] = {
    ...records[index],
    restoredDate: restoredDate || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
    restoredTime: restoredTime || new Date().toLocaleTimeString('en-US', { hour12: false }),
    actionTaken: actionTaken || records[index].actionTaken || 'RESOLVED AND RE-ENERGIZED',
    durationMinutes: durationMinutes !== undefined && durationMinutes !== null ? Number(durationMinutes) : records[index].durationMinutes,
    estimatedKwHrLoss: estimatedKwHrLoss !== undefined && estimatedKwHrLoss !== null ? Number(estimatedKwHrLoss) : records[index].estimatedKwHrLoss,
    estimatedRevenueLoss: estimatedRevenueLoss !== undefined && estimatedRevenueLoss !== null ? Number(estimatedRevenueLoss) : records[index].estimatedRevenueLoss,
    status: 'Resolve',
    updatedAt: new Date().toISOString()
  };

  writeJsonFile(RECORDS_FILE, records);
  res.json(records[index]);
});

// Reference tables routes
app.get('/api/reference-tables', (req, res) => {
  const tables = readJsonFile(TABLES_FILE, {});
  res.json(tables);
});

app.put('/api/reference-tables', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required to edit reference tables' });
    return;
  }

  writeJsonFile(TABLES_FILE, req.body);
  res.json({ success: true, message: 'Reference tables updated', tables: req.body });
});

// Reset records route
app.post('/api/records/reset', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required' });
    return;
  }

  const initialRecords = readJsonFile(path.join(DATA_DIR, 'records.json'), []);
  res.json({ success: true, count: initialRecords.length });
});

// Excel Export endpoint
app.get('/api/export/excel', (req, res) => {
  const records = readJsonFile<any[]>(RECORDS_FILE, []);
  const referenceTables = readJsonFile<any>(TABLES_FILE, {});

  // Translate lookup maps
  const causeMap = new Map((referenceTables.causes || []).map((c: any) => [c.code, c.description]));
  const weatherMap = new Map((referenceTables.weather || []).map((w: any) => [w.code, w.description]));
  const isolationMap = new Map((referenceTables.isolationDevices || []).map((i: any) => [i.code, i.description]));
  const equipMap = new Map((referenceTables.equipmentFailed || []).map((e: any) => [e.code, e.description]));
  const ssMap = new Map((referenceTables.substations || []).map((s: any) => [s.code, s.description]));

  // Sheet 1: Main records matching the uploaded sample.csv column names
  const mainData = records.map(r => ({
    'Incident ID': r.id,
    'SS': r.substation,
    'Substation Description': ssMap.get(r.substation) || r.substation,
    'Feeder': r.feeder,
    'Date of Interuption': r.dateOfInterruption,
    'Affected Area': r.affectedArea,
    'POLE ID': r.poleId,
    'StartTime of Interruption': r.startTime,
    'Restored Date': r.restoredDate || '',
    'Restored Time': r.restoredTime || '',
    'ActionTaken': r.actionTaken,
    'Duration  (Minutes)': r.durationMinutes !== null ? r.durationMinutes : '',
    'Number of Affected Consumers': r.affectedConsumers,
    'Cause of Interrution': r.causeCode,
    'Cause Description': causeMap.get(r.causeCode) || r.causeCode,
    'Weather': r.weatherCode,
    'Weather Description': weatherMap.get(r.weatherCode) || r.weatherCode,
    'Isolation Device': r.isolationDeviceCode,
    'Isolation Device Description': isolationMap.get(r.isolationDeviceCode) || r.isolationDeviceCode,
    'Equipment Failed': r.equipmentFailedCode,
    'Equipment Failed Description': equipMap.get(r.equipmentFailedCode) || r.equipmentFailedCode,
    'Remarks': r.remarks,
    'Estimated KwHr Loss': r.estimatedKwHrLoss !== null ? r.estimatedKwHrLoss : '',
    'Estimated Revenue Loss': r.estimatedRevenueLoss !== null ? r.estimatedRevenueLoss : '',
    'TYPE OF INTERRUPTION          (B/L/F/BB/)': r.interruptionType,
    'Status': r.status
  }));

  // Sheet 2: KPI Metrics summary
  const total = records.length;
  const active = records.filter(r => r.status === 'Active').length;
  const resolved = records.filter(r => r.status === 'Resolve').length;
  const scheduled = records.filter(r => r.status === 'Scheduled').length;
  const consumers = records.reduce((acc, r) => acc + (r.affectedConsumers || 0), 0);
  const durations = records.filter(r => r.durationMinutes !== null).map(r => r.durationMinutes as number);
  const avgDuration = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : '0';
  const totalKwHr = records.reduce((acc, r) => acc + (r.estimatedKwHrLoss || 0), 0).toFixed(2);
  const totalRev = records.reduce((acc, r) => acc + (r.estimatedRevenueLoss || 0), 0).toFixed(2);

  const kpiData = [
    { Metric: 'Total Interruption Incidents', Value: total },
    { Metric: 'Active Outages', Value: active },
    { Metric: 'Restored Outages', Value: resolved },
    { Metric: 'Scheduled Power Interruptions', Value: scheduled },
    { Metric: 'Total Affected Consumers', Value: consumers },
    { Metric: 'Average Restoration Duration (Minutes)', Value: avgDuration },
    { Metric: 'Total Estimated KwHr Loss', Value: totalKwHr },
    { Metric: 'Total Estimated Revenue Loss (PHP)', Value: totalRev },
    { Metric: 'Export Timestamp', Value: new Date().toISOString() }
  ];

  const wb = XLSX.utils.book_new();

  const wsMain = XLSX.utils.json_to_sheet(mainData);
  XLSX.utils.book_append_sheet(wb, wsMain, 'Interruption Records');

  const wsKpi = XLSX.utils.json_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI Summary');

  if (referenceTables.causes) {
    const wsCauses = XLSX.utils.json_to_sheet(referenceTables.causes);
    XLSX.utils.book_append_sheet(wb, wsCauses, 'Ref - Causes');
  }
  if (referenceTables.equipmentFailed) {
    const wsEquip = XLSX.utils.json_to_sheet(referenceTables.equipmentFailed);
    XLSX.utils.book_append_sheet(wb, wsEquip, 'Ref - Equipment');
  }
  if (referenceTables.substations) {
    const wsSS = XLSX.utils.json_to_sheet(referenceTables.substations);
    XLSX.utils.book_append_sheet(wb, wsSS, 'Ref - Substations');
  }
  if (referenceTables.classifications) {
    const wsClass = XLSX.utils.json_to_sheet(referenceTables.classifications);
    XLSX.utils.book_append_sheet(wb, wsClass, 'Ref - Classifications');
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Power_Interruptions_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Excel Import endpoint
app.post('/api/import/excel', (req, res) => {
  const currentUser = getUserFromToken(req.headers.authorization);
  if (!currentUser || currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator permission required to import workbooks' });
    return;
  }

  const { fileData, mode } = req.body; // fileData is base64 string, mode is 'replace' or 'append'
  if (!fileData) {
    res.status(400).json({ error: 'Workbook data is required' });
    return;
  }

  try {
    const buffer = Buffer.from(fileData, 'base64');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(ws);

    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'Workbook sheet contains no records' });
      return;
    }

    const currentRecords = readJsonFile<any[]>(RECORDS_FILE, []);
    const importedRecords: any[] = [];

    // Helper to find column value by loose name matching
    function getVal(row: any, ...keys: string[]): any {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
        const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const actualKey of Object.keys(row)) {
          if (actualKey.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerKey) {
            return row[actualKey];
          }
        }
      }
      return undefined;
    }

    for (const r of rows) {
      const id = String(getVal(r, 'Incident ID', 'id') || '').trim();
      if (!id) continue;

      const durationRaw = getVal(r, 'Duration  (Minutes)', 'Duration (Minutes)', 'Duration', 'durationMinutes');
      const consumersRaw = getVal(r, 'Number of Affected Consumers', 'Affected Consumers', 'affectedConsumers');
      const kwhRaw = getVal(r, 'Estimated KwHr Loss', 'KwHr Loss', 'estimatedKwHrLoss');
      const revRaw = getVal(r, 'Estimated Revenue Loss', 'Revenue Loss', 'estimatedRevenueLoss');
      const restoredDate = getVal(r, 'Restored Date', 'restoredDate');
      const restoredTime = getVal(r, 'Restored Time', 'restoredTime');
      const statusRaw = getVal(r, 'Status', 'status');

      importedRecords.push({
        id,
        substation: String(getVal(r, 'SS', 'Substation', 'substation') || '').trim(),
        feeder: String(getVal(r, 'Feeder', 'feeder') || '').trim(),
        dateOfInterruption: String(getVal(r, 'Date of Interuption', 'Date of Interruption', 'dateOfInterruption') || '').trim(),
        affectedArea: String(getVal(r, 'Affected Area', 'affectedArea') || '').trim(),
        poleId: String(getVal(r, 'POLE ID', 'Pole ID', 'poleId') || '').trim(),
        startTime: String(getVal(r, 'StartTime of Interruption', 'Start Time', 'startTime') || '').trim(),
        restoredDate: restoredDate ? String(restoredDate).trim() : null,
        restoredTime: restoredTime ? String(restoredTime).trim() : null,
        actionTaken: String(getVal(r, 'ActionTaken', 'Action Taken', 'actionTaken') || '').trim(),
        durationMinutes: durationRaw !== undefined && durationRaw !== null && durationRaw !== '' && !isNaN(Number(durationRaw)) ? Number(durationRaw) : null,
        affectedConsumers: consumersRaw !== undefined && consumersRaw !== null && consumersRaw !== '' && !isNaN(Number(consumersRaw)) ? Number(consumersRaw) : 0,
        causeCode: String(getVal(r, 'Cause of Interrution', 'Cause of Interruption', 'causeCode') || '').trim(),
        weatherCode: String(getVal(r, 'Weather', 'weatherCode') || '').trim(),
        isolationDeviceCode: String(getVal(r, 'Isolation Device', 'isolationDeviceCode') || '').trim(),
        equipmentFailedCode: String(getVal(r, 'Equipment Failed', 'equipmentFailedCode') || '').trim(),
        remarks: String(getVal(r, 'Remarks', 'remarks') || '').trim(),
        estimatedKwHrLoss: kwhRaw !== undefined && kwhRaw !== null && kwhRaw !== '' && !isNaN(Number(kwhRaw)) ? Number(kwhRaw) : null,
        estimatedRevenueLoss: revRaw !== undefined && revRaw !== null && revRaw !== '' && !isNaN(Number(revRaw)) ? Number(revRaw) : null,
        interruptionType: String(getVal(r, 'TYPE OF INTERRUPTION          (B/L/F/BB/)', 'Type of Interruption', 'interruptionType') || 'Lateral').trim(),
        status: statusRaw ? String(statusRaw).trim() : (restoredDate ? 'Resolve' : 'Active')
      });
    }

    let finalRecords: any[];
    if (mode === 'append') {
      const existingMap = new Map(currentRecords.map(r => [r.id, r]));
      for (const imp of importedRecords) {
        existingMap.set(imp.id, imp);
      }
      finalRecords = Array.from(existingMap.values());
    } else {
      finalRecords = importedRecords;
    }

    writeJsonFile(RECORDS_FILE, finalRecords);
    res.json({ success: true, count: finalRecords.length, importedCount: importedRecords.length });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to process workbook file: ' + (err.message || String(err)) });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Interruption Dashboard server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
