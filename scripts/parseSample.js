import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('data/sample.csv');
const raw = fs.readFileSync(csvPath, 'utf-8');

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
const header = parseCSVLine(lines[0]);

const records = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('Description,Code') || line.startsWith('Lateral,L') || line.startsWith('Block,B') || line.startsWith('Feeder,F') || line.startsWith('Backbone,BB') || line.startsWith('Substation,SS') || line.startsWith('Supply,NGCP')) {
    continue;
  }
  const cols = parseCSVLine(line);
  if (!cols[0] || !cols[0].startsWith('2026-')) continue;

  const [
    id,
    substation,
    feeder,
    dateOfInterruption,
    affectedArea,
    poleId,
    startTime,
    restoredDate,
    restoredTime,
    actionTaken,
    durationMinutes,
    affectedConsumers,
    causeCode,
    weatherCode,
    isolationDeviceCode,
    equipmentFailedCode,
    remarks,
    estimatedKwHrLoss,
    estimatedRevenueLoss,
    interruptionType,
    status
  ] = cols;

  records.push({
    id: id || '',
    substation: substation || '',
    feeder: feeder || '',
    dateOfInterruption: dateOfInterruption || '',
    affectedArea: affectedArea || '',
    poleId: poleId || '',
    startTime: startTime || '',
    restoredDate: restoredDate ? restoredDate : null,
    restoredTime: restoredTime ? restoredTime : null,
    actionTaken: actionTaken || '',
    durationMinutes: durationMinutes !== '' && !isNaN(Number(durationMinutes)) ? Number(durationMinutes) : null,
    affectedConsumers: affectedConsumers !== '' && !isNaN(Number(affectedConsumers)) ? Number(affectedConsumers) : 0,
    causeCode: causeCode || '',
    weatherCode: weatherCode || '',
    isolationDeviceCode: isolationDeviceCode || '',
    equipmentFailedCode: equipmentFailedCode || '',
    remarks: remarks || '',
    estimatedKwHrLoss: estimatedKwHrLoss !== '' && !isNaN(Number(estimatedKwHrLoss)) ? Number(estimatedKwHrLoss) : null,
    estimatedRevenueLoss: estimatedRevenueLoss !== '' && !isNaN(Number(estimatedRevenueLoss)) ? Number(estimatedRevenueLoss) : null,
    interruptionType: interruptionType || '',
    status: status || (restoredDate ? 'Resolve' : 'Active')
  });
}

console.log(`Parsed ${records.length} records successfully.`);
fs.writeFileSync('data/records.json', JSON.stringify(records, null, 2));

// Reference tables
const referenceTables = {
  classifications: [
    { code: 'L', description: 'Lateral', category: 'Distribution' },
    { code: 'B', description: 'Block', category: 'Distribution' },
    { code: 'F', description: 'Feeder', category: 'Primary Distribution' },
    { code: 'BB', description: 'Backbone', category: 'Main Trunk' },
    { code: 'SS', description: 'Substation', category: 'Substation Station' },
    { code: 'Supply', description: 'Supply (Grid / Transmission - NGCP)', category: 'Bulk Power' }
  ],
  causes: [
    { code: '001', description: 'Human Error / Contractor / Vehicle / Snapped Line' },
    { code: '002', description: 'Lightning Strike / Atmospheric Flashover' },
    { code: '004', description: 'Scheduled Power Interruption / Planned Maintenance' },
    { code: '005', description: 'Trees / Vegetation Contact / Falling Branches' },
    { code: '008', description: 'Grid / Transmission Unscheduled Interruption (NGCP)' },
    { code: '009', description: 'Equipment / Hardware Defect / Jumper Failure' },
    { code: '010', description: 'Animal / Wildlife Intrusion (Bat / Bird / Rat)' },
    { code: '011', description: 'Undetermined Fault / Unidentified Line Fault' }
  ],
  weather: [
    { code: '101', description: 'Inclement Weather / Heavy Rain / Wind' },
    { code: '102', description: 'Thunderstorm / Lightning Activity' },
    { code: '103', description: 'Overcast / Cloudy / Rain Showers' },
    { code: '104', description: 'Fair / Normal Weather / Clear' }
  ],
  isolationDevices: [
    { code: '201', description: 'Circuit Breaker (CB) / Substation Recloser' },
    { code: '202', description: 'Air Break Switch / Gang Disconnect / Sectionalizer' },
    { code: '203', description: 'Fuse Cutout (FCO) / Lateral Cutout' },
    { code: '204', description: 'Cutout Bypass / In-line Disconnect' }
  ],
  equipmentFailed: [
    { code: '301', description: 'Fuse Link / Lateral Cutout Fuse Link' },
    { code: '302', description: 'Secondary Line / Secondary Jumper / Service Drop' },
    { code: '303', description: 'Distribution Transformer (DT) / Bushing / Arrester' },
    { code: '304', description: 'Circuit Breaker / Substation Breaker / PRD Relay' },
    { code: '307', description: 'Crossarm / Pole Top Pin / Hardware' },
    { code: '308', description: 'Broken Cross Arm' },
    { code: '309', description: 'Leaned Pole / Structure' },
    { code: '310', description: 'Insulator (Pin Type / Suspension Insulator)' },
    { code: '311', description: 'Primary Jumper / Cutout Jumper Wire' },
    { code: '312', description: 'Primary Line / Conductor / CT / Bushing' }
  ],
  substations: [
    { code: 'QZN', description: 'Quezon Substation (Quezon, Licab, Sto. Domingo)' },
    { code: 'TAL', description: 'Talavera Substation (Talavera, Sto. Domingo)' },
    { code: 'GBA', description: 'Guimba Substation (Guimba, Talugtug)' },
    { code: 'LPO', description: 'Lupao Substation (Lupao, Muñoz, Talugtug)' },
    { code: 'MNZ', description: 'Muñoz Substation (Science City of Muñoz)' },
    { code: 'ALG', description: 'Aliaga Substation (Aliaga, Licab)' },
    { code: 'CAR', description: 'Carranglan Substation (Carranglan)' }
  ],
  feeders: [
    { code: 'F11', description: 'Talavera Feeder 11' },
    { code: 'F12', description: 'Talavera Feeder 12' },
    { code: 'F13', description: 'Talavera Feeder 13' },
    { code: 'F14', description: 'Talavera Feeder 14' },
    { code: 'F21', description: 'Muñoz Feeder 21' },
    { code: 'F22', description: 'Muñoz Feeder 22' },
    { code: 'F23', description: 'Muñoz Feeder 23' },
    { code: 'F24', description: 'Muñoz Feeder 24' },
    { code: 'F25', description: 'Muñoz Feeder 25' },
    { code: 'F31', description: 'Quezon Feeder 31' },
    { code: 'F32', description: 'Quezon Feeder 32' },
    { code: 'F33', description: 'Quezon Feeder 33' },
    { code: 'F41', description: 'Guimba Feeder 41' },
    { code: 'F42', description: 'Guimba Feeder 42' },
    { code: 'F43', description: 'Guimba Feeder 43' },
    { code: 'F51', description: 'Carranglan Feeder 51' },
    { code: 'F61', description: 'Aliaga Feeder 61' },
    { code: 'F62', description: 'Aliaga Feeder 62' },
    { code: 'F71', description: 'Lupao Feeder 71' },
    { code: 'F72', description: 'Lupao Feeder 72' }
  ]
};

fs.writeFileSync('data/reference_tables.json', JSON.stringify(referenceTables, null, 2));
console.log('Saved data/records.json and data/reference_tables.json');
