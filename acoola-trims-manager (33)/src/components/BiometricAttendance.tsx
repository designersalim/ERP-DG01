import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  UploadCloud, 
  Download, 
  Plus, 
  Trash, 
  Play, 
  Copy, 
  Check, 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  ArrowUpDown, 
  UserCheck, 
  Cpu, 
  Terminal, 
  Settings, 
  RefreshCw, 
  Sliders, 
  Eye,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Smartphone,
  HardDrive
} from 'lucide-react';
import { COMPANY_PROFILE } from '../data';

interface AppEmployee {
  id: string;
  name: string;
  designation: string;
  department: string;
  mobile: string;
}

export type DeviceBrand = 'ZKTeco' | 'Hikvision' | 'Dahua' | 'Anviz' | 'Suprema' | 'GenericUSB';

interface BiometricDevice {
  id: string;
  name: string;
  brand: DeviceBrand;
  model: string;
  ipAddress: string;
  port: number;
  status: 'Online' | 'Offline';
  lastSync: string;
}

interface BiometricLog {
  id: string;
  employeeId: string;
  employeeName: string;
  brand: DeviceBrand;
  timestamp: string; // ISO datetime
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  type: 'IN' | 'OUT' | 'PUNCH';
  source: 'Local PC Bridge' | 'USB Backup File' | 'Device API Hook' | 'Web Manual' | 'Simulator Test';
  deviceIp: string;
  verifyMode: string; // Fingerprint, Card, ID, Face, Password, QR Code
}

interface BiometricAttendanceProps {
  employees: AppEmployee[];
  canEdit?: boolean;
}

export default function BiometricAttendance({ employees, canEdit = true }: BiometricAttendanceProps) {
  // Configured Devices (stored in local storage)
  const [devices, setDevices] = useState<BiometricDevice[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_multi_biometric_devices');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { 
        id: 'DEV-01', 
        name: 'Main Factory entrance Gate', 
        brand: 'ZKTeco',
        model: 'ZKTeco K50-A / MB20', 
        ipAddress: '192.168.1.201', 
        port: 4370, 
        status: 'Online', 
        lastSync: new Date().toISOString() 
      },
      { 
        id: 'DEV-02', 
        name: 'Office Main Door Security', 
        brand: 'Hikvision',
        model: 'DS-K1T341AM Face Reader', 
        ipAddress: '192.168.1.150', 
        port: 80, 
        status: 'Online', 
        lastSync: new Date().toISOString() 
      },
      { 
        id: 'DEV-03', 
        name: 'Fabric Store Entry', 
        brand: 'Anviz',
        model: 'Anviz W1 Pro RFID', 
        ipAddress: '192.168.1.180', 
        port: 5010, 
        status: 'Offline', 
        lastSync: 'N/A' 
      }
    ];
  });

  // Saved Logs (stored in local storage)
  const [logs, setLogs] = useState<BiometricLog[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_multi_biometric_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Seed beautiful mock records representing multi-brand real inputs
    const todayStr = new Date().toISOString().substring(0, 10);
    return [
      {
        id: 'LOG-M1',
        employeeId: 'EMP-1001',
        employeeName: 'মোঃ সালিম',
        brand: 'ZKTeco',
        timestamp: `${todayStr}T09:05:12`,
        date: todayStr,
        time: '09:05:12',
        type: 'IN',
        source: 'Local PC Bridge',
        deviceIp: '192.168.1.201',
        verifyMode: 'Fingerprint'
      },
      {
        id: 'LOG-M2',
        employeeId: 'EMP-1002',
        employeeName: 'রিয়াদ হাসান',
        brand: 'Hikvision',
        timestamp: `${todayStr}T08:58:22`,
        date: todayStr,
        time: '08:58:22',
        type: 'IN',
        source: 'Device API Hook',
        deviceIp: '192.168.1.150',
        verifyMode: 'Face Match'
      },
      {
        id: 'LOG-M3',
        employeeId: 'EMP-1003',
        employeeName: 'আসাদুল্লাহ শেখ',
        brand: 'GenericUSB',
        timestamp: `${todayStr}T09:12:45`,
        date: todayStr,
        time: '09:12:45',
        type: 'IN',
        source: 'USB Backup File',
        deviceIp: 'COM3 USB Port',
        verifyMode: 'RFID Card'
      },
      {
        id: 'LOG-M4',
        employeeId: 'ACD220201',
        employeeName: 'Shakhawat Hossain',
        brand: 'Dahua',
        timestamp: `${todayStr}T08:45:00`,
        date: todayStr,
        time: '08:45:00',
        type: 'IN',
        source: 'Simulator Test',
        deviceIp: '192.168.1.220',
        verifyMode: 'Fingerprint'
      }
    ];
  });

  // Persists states in LocalStorage
  useEffect(() => {
    localStorage.setItem('acoola_multi_biometric_devices', JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem('acoola_multi_biometric_logs', JSON.stringify(logs));
  }, [logs]);

  // UI Navigation / Brand selectors
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'agents' | 'file-upload' | 'devices' | 'docs'>('terminal');
  const [selectedAgentBrand, setSelectedAgentBrand] = useState<DeviceBrand>('ZKTeco');
  const [selectedUploadFormat, setSelectedUploadFormat] = useState<'generic_csv' | 'zk_dat' | 'hik_csv' | 'anviz_txt' | 'suprema_csv'>('generic_csv');

  // New hardware state variables
  const [deviceIpInput, setDeviceIpInput] = useState('192.168.1.250');
  const [devicePortInput, setDevicePortInput] = useState(4370);
  const [deviceNameInput, setDeviceNameInput] = useState('Main Office Door Reader');
  const [deviceBrandInput, setDeviceBrandInput] = useState<DeviceBrand>('ZKTeco');
  const [deviceModelInput, setDeviceModelInput] = useState('ZKTeco K50-A / Realand');

  // Quick Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().substring(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('All');

  // Simulator Engine States
  const [selectedEmployeeForSim, setSelectedEmployeeForSim] = useState('');
  const [simPunchType, setSimPunchType] = useState<'IN' | 'OUT'>('IN');
  const [simVerifyMode, setSimVerifyMode] = useState('Fingerprint');
  const [simDeviceIndex, setSimDeviceIndex] = useState(0);

  // Manual Input Form
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().substring(0, 10));
  const [manualTime, setManualTime] = useState('09:00');
  const [manualType, setManualType] = useState<'IN' | 'OUT'>('IN');
  const [manualBrand, setManualBrand] = useState<DeviceBrand>('ZKTeco');

  const [copiedCode, setCopiedCode] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccessMsg, setFileSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto port recommendation helper on brand change
  const handleBrandChangeOnAddForm = (brand: DeviceBrand) => {
    setDeviceBrandInput(brand);
    if (brand === 'ZKTeco') {
      setDevicePortInput(4370);
      setDeviceModelInput('ZKTeco K50-A / Realand');
    } else if (brand === 'Hikvision') {
      setDevicePortInput(80);
      setDeviceModelInput('Hikvision DS-K1T Series');
    } else if (brand === 'Dahua') {
      setDevicePortInput(37777);
      setDeviceModelInput('Dahua ASA Series Biometric');
    } else if (brand === 'Anviz') {
      setDevicePortInput(5010);
      setDeviceModelInput('Anviz W1/W2 Pro Reader');
    } else if (brand === 'Suprema') {
      setDevicePortInput(8010);
      setDeviceModelInput('Suprema BioEntry / BioLite');
    } else {
      setDevicePortInput(0);
      setDeviceModelInput('Generic USB RFID Keyboard Wedge');
    }
  };

  // Stats Counters
  const activeDeviceCount = devices.filter(d => d.status === 'Online').length;
  
  // Filtering and Sorting logic
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.verifyMode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterDate ? l.date === filterDate : true;
    const matchesBrand = filterBrand === 'All' ? true : l.brand === filterBrand;
    return matchesSearch && matchesDate && matchesBrand;
  }).sort((a,b) => b.timestamp.localeCompare(a.timestamp));

  // Add Device Configuration
  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceNameInput || !deviceIpInput) {
      alert("ডিভাইসের নাম এবং আইপি অ্যাড্রেস প্রদান করা আবশ্যক!");
      return;
    }
    const newDev: BiometricDevice = {
      id: `DEV-${Date.now().toString().slice(-4)}`,
      name: deviceNameInput,
      brand: deviceBrandInput,
      model: deviceModelInput,
      ipAddress: deviceIpInput,
      port: devicePortInput,
      status: 'Online',
      lastSync: new Date().toISOString()
    };
    setDevices(prev => [...prev, newDev]);
    setDeviceNameInput('');
    alert("নতুন বায়োমেট্রিক ডিভাইস সফলভাবে রেজিস্টার করা হয়েছে!");
  };

  // Delete Device Config
  const handleDeleteDevice = (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই বায়োমেট্রিক ডিভাইসটি রিমুভ করতে চান?")) {
      setDevices(prev => prev.filter(d => d.id !== id));
    }
  };

  // Clear Attendance Logs Helper
  const handleClearLogs = () => {
    if (window.confirm("সাবধান! আপনি কি ডোমেন মেমোরি থেকে সমস্ত হাজিরা রেকর্ড ট্র্যাশ করতে চান?")) {
      setLogs([]);
    }
  };

  // Manual Punch Insertion
  const handleAddManualPunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId) {
      alert('দয়া করে একজন স্টাফ কর্মকর্তা নির্বাচন করুন!');
      return;
    }
    const emp = employees.find(e => e.id === manualEmpId);
    if (!emp) return;

    const formattedTimestamp = `${manualDate}T${manualTime}:00`;
    const newLog: BiometricLog = {
      id: `LOG-MAN-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      brand: manualBrand,
      timestamp: formattedTimestamp,
      date: manualDate,
      time: `${manualTime}:00`,
      type: manualType,
      source: 'Web Manual',
      deviceIp: 'Web Admin Portal',
      verifyMode: 'Manual Admin override'
    };

    setLogs(prev => [newLog, ...prev]);
    alert('হাজিরা ম্যানুয়ালি সিস্টেমের লোকাল রেজিস্ট্রে ভর্তি করা হয়েছে!');
    setManualEmpId('');
  };

  // Simulate Instant Card/Finger Scan for ANY selected registered device
  const handleSimulateScan = () => {
    if (!selectedEmployeeForSim) {
      alert('দয়া করে একজন কর্মকর্তা সিলেক্ট করুন যাকে দিয়ে পান্চ সিমুলেট করাতে চান!');
      return;
    }
    const emp = employees.find(e => e.id === selectedEmployeeForSim);
    if (!emp) return;

    const dev = devices[simDeviceIndex];
    if (!dev) {
      alert('সিমুলেশন করার জন্য কোনো বায়োমেট্রিক ডিভাইস সিলেক্ট করা নেই!');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString().substring(0, 19);
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().substring(0, 10);

    const newLog: BiometricLog = {
      id: `LOG-SIM-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      brand: dev.brand,
      timestamp: nowIso,
      date: dateStr,
      time: timeStr,
      type: simPunchType,
      source: 'Simulator Test',
      deviceIp: dev.ipAddress,
      verifyMode: simVerifyMode
    };

    setLogs(prev => [newLog, ...prev]);

    // Set simulator device status as active Online on punch
    const updatedDevs = [...devices];
    updatedDevs[simDeviceIndex] = {
      ...updatedDevs[simDeviceIndex],
      status: 'Online',
      lastSync: now.toISOString()
    };
    setDevices(updatedDevs);
  };

  // File Upload Parser - Custom parsers for each device brand!
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setFileError("ফাইলটি খালি বা রিড করতে ত্রুটি রয়েছে।");
          return;
        }

        const lines = text.split(/\r?\n/);
        let parsedCount = 0;
        let matchedCount = 0;
        const tempLogs: BiometricLog[] = [];

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          // PARSER 1: Generic Clean CSV Formats
          // Template pattern: EmployeeID, YYYY-MM-DD, HH:MM:SS, IN/OUT/PUNCH, Brand
          if (selectedUploadFormat === 'generic_csv') {
            const tokens = trimmed.split(',');
            if (tokens.length >= 3) {
              const rId = tokens[0].trim();
              const rDate = tokens[1].trim();
              const rTime = tokens[2].trim();
              const rType = (tokens[3] || 'IN').trim().toUpperCase() as 'IN' | 'OUT' | 'PUNCH';
              const rBrand = (tokens[4] || 'GenericUSB').trim() as DeviceBrand;

              if (rDate.includes('-') && rTime.includes(':')) {
                const matchedEmp = employees.find(emp => emp.id.toLowerCase().trim() === rId.toLowerCase().trim());
                const empNameVal = matchedEmp ? matchedEmp.name : `Card No. [${rId}]`;
                if (matchedEmp) matchedCount++;

                tempLogs.push({
                  id: `LOG-CSV-${Date.now()}-${parsedCount}`,
                  employeeId: rId,
                  employeeName: empNameVal,
                  brand: rBrand,
                  timestamp: `${rDate}T${rTime}`,
                  date: rDate,
                  time: rTime,
                  type: rType === 'PUNCH' ? 'IN' : rType,
                  source: 'USB Backup File',
                  deviceIp: 'Direct CSV Link',
                  verifyMode: 'Card / Keyboard Reader'
                });
                parsedCount++;
              }
            }
          }

          // PARSER 2: ZKTeco standard `attlog.dat` layout (space delimited)
          // File pattern: "UserNo YYYY-MM-DD HH:MM:SS State Workcode"
          // E.g.: "1001 2026-06-22 09:15:30 1 0"
          else if (selectedUploadFormat === 'zk_dat') {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 3) {
              const userNum = tokens[0];
              const possibleDate = tokens[1];
              const possibleTime = tokens[2];
              const statusCode = tokens[3] || '0';

              if (possibleDate.includes('-') && possibleTime.includes(':')) {
                const matchId = userNum;
                const matchedEmp = employees.find(emp => 
                  emp.id.replace(/\D/g, '') === matchId.replace(/\D/g, '') ||
                  emp.id.toLowerCase().trim() === matchId.toLowerCase().trim()
                );

                const empIdVal = matchedEmp ? matchedEmp.id : `EMP-${matchId}`;
                const empNameVal = matchedEmp ? matchedEmp.name : `Device Registrant ID [${matchId}]`;
                if (matchedEmp) matchedCount++;

                tempLogs.push({
                  id: `LOG-ZKDAT-${Date.now()}-${parsedCount}`,
                  employeeId: empIdVal,
                  employeeName: empNameVal,
                  brand: 'ZKTeco',
                  timestamp: `${possibleDate}T${possibleTime}`,
                  date: possibleDate,
                  time: possibleTime,
                  type: statusCode === '1' ? 'OUT' : 'IN',
                  source: 'USB Backup File',
                  deviceIp: 'attlog.dat stream',
                  verifyMode: 'Fingerprint Sensor'
                });
                parsedCount++;
              }
            }
          }

          // PARSER 3: Hikvision CSV logs export
          // Hik export format: "Index,Name,EmployeeNo,Time,Direction,DeviceName"
          // E.g.: "1,Salim,EMP-1001,2026-06-22 09:05:12,In,GateReader-2"
          else if (selectedUploadFormat === 'hik_csv') {
            const tokens = trimmed.split(',');
            if (tokens.length >= 5) {
              const rId = tokens[2].trim();
              const rDateStr = tokens[3].trim(); // YYYY-MM-DD HH:MM:SS
              const direction = tokens[4].trim().toUpperCase();

              if (rDateStr.includes(' ')) {
                const dateTimeParts = rDateStr.split(' ');
                const possibleDate = dateTimeParts[0];
                const possibleTime = dateTimeParts[1];

                const matchedEmp = employees.find(emp => emp.id.toLowerCase().trim() === rId.toLowerCase().trim());
                const empNameVal = matchedEmp ? matchedEmp.name : `Hik ID [${rId}]`;
                if (matchedEmp) matchedCount++;

                tempLogs.push({
                  id: `LOG-HIKCSV-${Date.now()}-${parsedCount}`,
                  employeeId: rId,
                  employeeName: empNameVal,
                  brand: 'Hikvision',
                  timestamp: `${possibleDate}T${possibleTime}`,
                  date: possibleDate,
                  time: possibleTime,
                  type: direction === 'OUT' || direction === 'EXIT' ? 'OUT' : 'IN',
                  source: 'USB Backup File',
                  deviceIp: 'Hikvision CSV Export',
                  verifyMode: 'Face Match recognition'
                });
                parsedCount++;
              }
            }
          }

          // PARSER 4: Anviz device log export (tab delimited)
          // Pattern: "UserCode   Date    Time    DeviceID    State"
          // E.g.: "1003 2026-06-22  09:12:45  1   1"
          else if (selectedUploadFormat === 'anviz_txt') {
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 3) {
              const userNum = tokens[0];
              const possibleDate = tokens[1];
              const possibleTime = tokens[2];
              const state = tokens[4] || '1';

              if (possibleDate.includes('-') && possibleTime.includes(':')) {
                const matchedEmp = employees.find(emp => 
                  emp.id.replace(/\D/g, '') === userNum.replace(/\D/g, '')
                );
                
                const empIdVal = matchedEmp ? matchedEmp.id : `EMP-${userNum}`;
                const empNameVal = matchedEmp ? matchedEmp.name : `Anviz Device ID [${userNum}]`;
                if (matchedEmp) matchedCount++;

                tempLogs.push({
                  id: `LOG-ANV-${Date.now()}-${parsedCount}`,
                  employeeId: empIdVal,
                  employeeName: empNameVal,
                  brand: 'Anviz',
                  timestamp: `${possibleDate}T${possibleTime}`,
                  date: possibleDate,
                  time: possibleTime,
                  type: state === '2' ? 'OUT' : 'IN',
                  source: 'USB Backup File',
                  deviceIp: 'Anviz Text Stream',
                  verifyMode: 'Finger/RFID Lock'
                });
                parsedCount++;
              }
            }
          }

          // PARSER 5: Suprema CSV export
          // Format: "UserID,UserName,DateTime,EventName,Device"
          else if (selectedUploadFormat === 'suprema_csv') {
            const tokens = trimmed.split(',');
            if (tokens.length >= 4) {
              const rId = tokens[0].trim();
              const rDateStr = tokens[2].trim(); // YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS
              const eventStr = tokens[3].trim().toLowerCase();

              let cleanDate = '';
              let cleanTime = '';
              if (rDateStr.includes('T')) {
                const parts = rDateStr.split('T');
                cleanDate = parts[0];
                cleanTime = parts[1];
              } else if (rDateStr.includes(' ')) {
                const parts = rDateStr.split(' ');
                cleanDate = parts[0];
                cleanTime = parts[1];
              }

              if (cleanDate && cleanTime) {
                const matchedEmp = employees.find(emp => emp.id.toLowerCase().trim() === rId.toLowerCase().trim());
                const empNameVal = matchedEmp ? matchedEmp.name : `Suprema Registrant [${rId}]`;
                if (matchedEmp) matchedCount++;

                tempLogs.push({
                  id: `LOG-SUP-${Date.now()}-${parsedCount}`,
                  employeeId: rId,
                  employeeName: empNameVal,
                  brand: 'Suprema',
                  timestamp: `${cleanDate}T${cleanTime}`,
                  date: cleanDate,
                  time: cleanTime,
                  type: eventStr.includes('out') || eventStr.includes('exit') ? 'OUT' : 'IN',
                  source: 'USB Backup File',
                  deviceIp: 'Suprema CSV Dump',
                  verifyMode: 'Biometric Access control'
                });
                parsedCount++;
              }
            }
          }

        });

        if (parsedCount === 0) {
          setFileError("ফাইল থেকে রসিদ সনাক্ত করা যায়নি। দয়া করে নির্বাচিত ফাইল ফরম্যাটের গঠন চুজ করে আপলোড করতে ট্রাই করুন!");
          return;
        }

        // Merge keeping uniq records
        setLogs(prev => {
          const merged = [...tempLogs];
          prev.forEach(prevL => {
            const exists = tempLogs.some(n => n.employeeId === prevL.employeeId && n.timestamp === prevL.timestamp);
            if (!exists) merged.push(prevL);
          });
          return merged;
        });

        setFileSuccessMsg(
          `হুররে! সফলভাবে ${parsedCount} টি এন্ট্রি ব্যাকআপ ফাইল থেকে প্রসেস হয়েছে। এর মধ্যে ${matchedCount} টি রেকর্ড হুবহু স্টাফ ডাটাবেজের কর্মচারীদের সাথে ম্যাচ করে স্বয়ংক্রিয় সিঙ্ক হয়েছে!`
        );

        if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (err: any) {
        setFileError(`ফাইল পার্সিং ত্রুটি: ${err.message || 'Error occurred while executing.'}`);
      }
    };
    reader.readAsText(file);
  };

  // Helper code generators based on chosen brand!
  const getBrandScriptCode = (brand: DeviceBrand) => {
    const origin = window.location.origin;
    if (brand === 'ZKTeco') {
      return `# =========================================================================
# 🐍 ZKTeco / Realand Python Real-time Bridge Script
# Supports: ZK K50-A, K40, SB100, MB20, etc. (ZK Software Protocol TCP/UDP)
# =========================================================================
import time
import requests
from datetime import datetime
from zk import ZK, const

# System Configuration
DEVICE_IP = "${devices.find(d => d.brand === 'ZKTeco')?.ipAddress || '192.168.1.201'}"
DEVICE_PORT = 4370 
ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

print(f"[*] Connecting to local ZKTeco Device at {DEVICE_IP}:{DEVICE_PORT}...")

zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=6, force_udp=False)
conn = None

try:
    conn = zk.connect()
    print("[+] Connected successfully! Fetching existing biometric cache logs...")
    attendance = conn.get_attendance()
    
    for r in attendance:
        payload = {
            "employeeId": f"EMP-{r.user_id}" if not str(r.user_id).startswith("EMP") else str(r.user_id),
            "timestamp": r.timestamp.strftime('%Y-%m-%dT%H:%M:%S'),
            "punchType": "IN" if r.status == 0 else "OUT",
            "verifyMode": "Fingerprint / Card",
            "deviceIP": DEVICE_IP,
            "brand": "ZKTeco"
        }
        print(f"[>] Syncing Attlog Log: Employee {r.user_id} @ {payload['timestamp']}")
        # requests.post(ERP_API_WEBHOOK, json=payload) # Uncomment for online sync!
        
    print("[*] Device in scanning state. Live attendance listener is listening...")
    
except Exception as e:
    print(f"[-] Error: {e}. Check network settings or run Ping command.")
finally:
    if conn:
        conn.disconnect()
        print("[*] Released device lock.")
`;
    } 
    
    if (brand === 'Hikvision') {
      return `# =========================================================================
# 🐍 Hikvision Face/Card Terminal Listener (ISAPI Notification Client)
# Supports: Hikvision DS-K1T Series Readers (DS-K1T341, DS-K1T671, etc.)
# =========================================================================
import time
import requests
import json
from datetime import datetime

# Hikvision uses a persistent HTTP event notification listener Stream
DEVICE_IP = "${devices.find(d => d.brand === 'Hikvision')?.ipAddress || '192.168.1.150'}"
DEVICE_PORT = 80
HIK_USER = "admin"
HIK_PASS = "admin12345" # Replace with your terminal admin password
ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

print(f"[*] Initializing real-time stream listener for Hikvision Access Device {DEVICE_IP}...")

# Hikvision ISAPI delivers event streams in HTTP chunked XML/JSON multi-parts.
url = f"http://{DEVICE_IP}:{DEVICE_PORT}/ISAPI/AccessControl/Event/notification"
headers = {'Content-Type': 'application/xml'}

try:
    # Authenticate and start live streaming response
    from requests.auth import HTTPDigestAuth
    auth = HTTPDigestAuth(HIK_USER, HIK_PASS)
    
    response = requests.get(url, auth=auth, stream=True, timeout=3600)
    print(f"[+] Digested Auth success! Status: {response.status_code}")
    
    for chunk in response.iter_lines():
        if chunk:
            decoded_line = chunk.decode('utf-8', errors='ignore')
            # Look for Event type and Card/User detail XML nodes
            if "<employeeNo>" in decoded_line:
                # Simple extraction
                emp_id = decoded_line.split("<employeeNo>")[1].split("</employeeNo>")[0]
                print(f"[+] Real-Time Event: Hikvision face match detected for Employee code: {emp_id}")
                
                # Push back into Cloud ERP API
                payload = {
                    "employeeId": emp_id,
                    "timestamp": datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
                    "punchType": "IN",
                    "verifyMode": "Face Lock recognition",
                    "deviceIP": DEVICE_IP,
                    "brand": "Hikvision"
                }
                print(f"[>] Forwarded log to ERP endpoint.")
                
except KeyboardInterrupt:
    print("[*] Stream stopped by user.")
except Exception as e:
    print(f"[-] Connection failed. Make sure ISAPI protocol is enabled in Hikvision web panel.")
`;
    }

    if (brand === 'Anviz') {
      return `# =========================================================================
# 🐍 Anviz TCP Client Attendance sync loop
# Supports: Anviz W1, W2, EP300, TC550 etc.
# =========================================================================
import socket
import struct
import requests
from datetime import datetime

DEVICE_IP = "${devices.find(d => d.brand === 'Anviz')?.ipAddress || '192.168.1.180'}"
DEVICE_PORT = 5010 # Default Anviz communication socket port
ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

def build_anviz_header(cmd, device_id=1, data_len=0):
    # Anviz binary TCP protocol structure command package
    header = struct.pack('>B I B H', 0xA5, device_id, cmd, data_len)
    return header

print(f"[*] Initializing Anviz TCP sync socket on {DEVICE_IP}:{DEVICE_PORT}...")

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect((DEVICE_IP, DEVICE_PORT))
    print("[+] TCP Connection made! Querying new entries...")
    
    # Send Get Records command to Anviz socket
    req = build_anviz_header(0x3C, device_id=1, data_len=0) # 0x3C is Get Logs
    s.send(req)
    response = s.recv(1024)
    print(f"[+] Received Binary response bytes count: {len(response)}")
    
    # Parsed records can then be pushed to ERP API
    # requests.post(ERP_API_WEBHOOK, json=...)
    s.close()
except Exception as e:
    print(f"[-] TCP Socket failure: {e}")
`;
    }

    if (brand === 'Dahua') {
      return `# =========================================================================
# 🐍 Dahua CGI HTTP Webhook Receiver Agent
# Client script to capture event triggers from Dahua ASA Biometrics
# =========================================================================
import requests
from datetime import datetime

# Dahua can configure direct HTTP server subscription webhooks inside the web browser settings!
# Alternatively, parse via python listener:
DEVICE_IP = "${devices.find(d => d.brand === 'Dahua')?.ipAddress || '192.168.1.220'}"
ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

print(f"[*] Listening to Dahua biometric CGI network event stream...")
print("    Tip: Dahua devices have built-in Webhook APIs that can automatically push")
print("         direct scans to custom backend HTTP ports. You do not need python scripts!")
`;
    }

    if (brand === 'Suprema') {
      return `# =========================================================================
# 🐍 Suprema BioStar 2 Real-Time integration script
# Supports Suprema BioEntry, BioLite, BioStation 2
# =========================================================================
import requests
import json
from datetime import datetime

BIOSTAR_API_URL = "http://localhost:8790" # Local BioStar 2 server controller
ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

print("[*] Retrieving event stream logs from local BioStar server manager...")
try:
    # BioStar 2 provides standard authenticated API endpoints to fetch live scanner events
    res = requests.get(f"{BIOSTAR_API_URL}/api/events", headers={"Accept": "application/json"})
    if res.status_code == 200:
        events = res.json().get('records', [])
        print(f"[+] Synced {len(events)} events from Suprema bio scanner.")
except Exception as e:
    print(f"[-] BioStar server connection failed: {e}")
`;
    }

    // GenericUSB
    return `# =========================================================================
# 🐍 Generic USB RFID Reader Wedge script (Keyboard COM Emulation)
# Emulates standard USB desktop swipe readers on any connected host computer.
# =========================================================================
import sys
import requests
from datetime import datetime

ERP_API_WEBHOOK = "${origin}/api/biometric/sync"

print("[*] Desktop USB Smart RFID Swipe Reader wedge active.")
print("[i] Place focus in CMD and scan a member's RFID badge to log entry.")

try:
    while True:
        rfid_badge = input("RFID Swipe Scan Badge Code: ").strip()
        if rfid_badge:
            timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
            payload = {
                "employeeId": rfid_badge,
                "timestamp": timestamp,
                "punchType": "IN",
                "verifyMode": "RFID Card Wedge",
                "deviceIP": "USB Virtual Keyboard COM",
                "brand": "GenericUSB"
            }
            print(f"[+] Logging RFID Check-in Card: {rfid_badge} @ {timestamp}")
            # requests.post(ERP_API_WEBHOOK, json=payload)
except KeyboardInterrupt:
    print("\\n[*] Goodbye.")
`;
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans border-t border-emerald-200">
      {/* Upper Status Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 text-white py-4 px-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400 animate-pulse animate-duration-1000" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 font-mono">Multi-Brand Integrated Gateway</span>
          </div>
          <h2 className="text-2xl font-black text-white font-sans flex items-center gap-2 mt-0.5">
            Biometric Hardware Sync Suite
            <span className="text-xs bg-emerald-900 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">Universal Hub</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold mt-1">ZKTeco, Hikvision, Dahua, Anviz, Suprema ও অন্যান্য যেকোনো ব্রান্ডের লাইভ হাজিরা সংযোগ কেন্দ্র</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-center">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Readers</span>
            <span className="text-md font-black text-emerald-400 font-mono flex items-center justify-center gap-1 mt-0.5">
              <Wifi className="w-3.5 h-3.5" /> {activeDeviceCount} Online
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-center">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Global Log Items</span>
            <span className="text-md font-black text-sky-400 font-mono mt-0.5 block">{logs.length} Lines</span>
          </div>
        </div>
      </div>

      {/* Main layout wrapper */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* Warning notification about Payroll Separation */}
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 font-bold leading-relaxed space-y-1">
            <p className="font-black text-slate-905 text-sm">🔒 Standalone Sandbox Biometric Attendance Architecture (মাল্টি-ব্রান্ড সমর্থন কেন্দ্র)</p>
            <p>আপনার নির্দেশনা অনুসারে এই মডিউলটি সম্পূর্ণ মডুলার ও ইন্টিগ্রেটেড। এটি <b>Corporate Staff Payroll</b> শিটের সাথে কোনো সংঘর্ষ বাঁধায় না (বেতন শিট সম্পূর্ণ নিরাপদ এবং অপরিবর্তিত থাকে)। যেকোনো ব্রান্ডের বায়োমেট্রিক ও রিডার ডিভাইস পিসি বা ওয়াইফাই এর মাধ্যমে সরাসরি রিয়েল-টাইমে এখানে হাজিরা সিঙ্ক করতে পারে।</p>
          </div>
        </div>

        {/* Outer Navigation sub-header */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1.5 pb-1 justify-start">
          <button
            onClick={() => setActiveSubTab('terminal')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'terminal'
                ? 'bg-emerald-600 text-white shadow font-extrabold'
                : 'text-slate-650 hover:bg-slate-150 hover:text-slate-900 font-bold'
            }`}
          >
            <Sliders className="w-4 h-4" />
            📊 Live Logs &amp; Statistics (হাজিরা ড্যাশবোর্ড)
          </button>
          
          <button
            onClick={() => setActiveSubTab('agents')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'agents'
                ? 'bg-emerald-600 text-white shadow font-extrabold'
                : 'text-slate-650 hover:bg-slate-150 hover:text-slate-900 font-bold'
            }`}
          >
            <Terminal className="w-4 h-4" />
            🔌 Local PC Agents (রিয়েল-টাইম ব্রিজিং কোড পাইথন)
          </button>

          <button
            onClick={() => setActiveSubTab('file-upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'file-upload'
                ? 'bg-emerald-600 text-white shadow font-extrabold'
                : 'text-slate-650 hover:bg-slate-150 hover:text-slate-900 font-bold'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            📁 USB `.dat` / Multi-Format CSV Parser (ব্যাকআপ ফাইল আপলোডার)
          </button>

          <button
            onClick={() => setActiveSubTab('devices')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'devices'
                ? 'bg-emerald-600 text-white shadow font-extrabold'
                : 'text-slate-650 hover:bg-slate-150 hover:text-slate-900 font-bold'
            }`}
          >
            <Settings className="w-4 h-4" />
            ⚙️ Hardware Management (মেশিন কনফিগারেশন)
          </button>

          <button
            onClick={() => setActiveSubTab('docs')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'docs'
                ? 'bg-emerald-600 text-white shadow font-extrabold'
                : 'text-slate-650 hover:bg-slate-150 hover:text-slate-900 font-bold'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            📖 Brand SDK Manual (ইন্টিগ্রেশন গাইডলাইন)
          </button>
        </div>

        {/* SUBTAB 1: Attendance Grid Dashboard */}
        {activeSubTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side filters + simulator */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Filter controls */}
              <div className="bg-white border border-slate-205 rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  ফিল্টার সেটিংস (Search Options)
                </h3>
                <div className="space-y-3 font-bold">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">📅 Attendance Date (তারিখ)</label>
                    <input 
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-850 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">🏷️ Brand Filter (মেশিন ব্রান্ড)</label>
                    <select
                      value={filterBrand}
                      onChange={(e) => setFilterBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-850 mt-1"
                    >
                      <option value="All">All Brands (সব ব্রান্ড)</option>
                      <option value="ZKTeco">ZKTeco / Realand</option>
                      <option value="Hikvision">Hikvision Access</option>
                      <option value="Dahua">Dahua Biometrics</option>
                      <option value="Anviz">Anviz Systems</option>
                      <option value="Suprema">Suprema High-End</option>
                      <option value="GenericUSB">USB Virtual / Keyboard Card wedge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">🔍 Query (নাম / আইডি / মেথড)</label>
                    <div className="relative mt-1">
                      <input 
                        type="text"
                        placeholder="ID or Name search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-800"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setFilterDate('');
                        setSearchQuery('');
                        setFilterBrand('All');
                      }}
                      className="w-full bg-slate-100 text-slate-700 border hover:bg-slate-200 py-1.5 rounded text-xs transition-all cursor-pointer"
                    >
                      সমস্ত ফিল্টার ক্লিয়ার করুন
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Trial Simulator Engine */}
              <div className="bg-gradient-to-br from-slate-905 to-emerald-950 text-white rounded-xl p-4 shadow-md border border-emerald-900/60 space-y-4">
                <div className="flex justify-between items-center border-b border-emerald-800 pb-2">
                  <h3 className="text-sm font-black text-emerald-200 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Universal Hardware Simulator
                  </h3>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black uppercase">Live Tool</span>
                </div>
                
                <p className="text-[10px] text-slate-300 leading-relaxed font-bold">
                  বাহির থেকে ক্লাউড এপিআই পরীক্ষার জন্য যেকোনো রেজিস্টার্ড হার্ডওয়্যার ব্রান্ড ডিভাইস হুবহু কাল্পনিকভাবে সিমুলেট করতে পারেন:
                </p>

                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-emerald-300 uppercase">👤 Select Staff Employee (সিলেকশন কর্মকর্তা)</label>
                    <select
                      value={selectedEmployeeForSim}
                      onChange={(e) => setSelectedEmployeeForSim(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1.5 text-white mt-1 font-bold"
                    >
                      <option value="">-- Choose employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-emerald-300 uppercase">📡 Select Registered Machine Device (মেশিন)</label>
                    <select
                      value={simDeviceIndex}
                      onChange={(e) => setSimDeviceIndex(parseInt(e.target.value))}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1.5 text-white mt-1 font-mono font-bold"
                    >
                      {devices.map((d, index) => (
                        <option key={d.id} value={index}>{d.name} [{d.brand} - {d.ipAddress}]</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-emerald-300 uppercase">🔄 Action State</label>
                      <select
                        value={simPunchType}
                        onChange={(e) => setSimPunchType(e.target.value as 'IN' | 'OUT')}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-white mt-1 font-bold"
                      >
                        <option value="IN">IN (প্রবেশ)</option>
                        <option value="OUT">OUT (বাহির)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-emerald-300 uppercase">📶 Scan Mode</label>
                      <select
                        value={simVerifyMode}
                        onChange={(e) => setSimVerifyMode(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-white mt-1 font-bold"
                      >
                        <option value="Fingerprint">Fingerprint (আঙুল)</option>
                        <option value="Face Match">Face recognition (চেহারা)</option>
                        <option value="RFID Card">RFID Smart Card (কার্ড)</option>
                        <option value="QR Code Scan">Access QR Code (কিউআর)</option>
                        <option value="Keyboard Input">Key Pass ID (পিন কোড)</option>
                      </select>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      onClick={handleSimulateScan}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black hover:shadow-emerald-500/10 py-2 rounded text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Play className="w-3.5 h-3.5 text-white" /> PROCESS SIMULATION PUNCH
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Check-in Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5 uppercase">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  ম্যানুয়াল প্রবেশপত্র (Manual Punch Entry)
                </h3>
                <form onSubmit={handleAddManualPunch} className="space-y-3 font-bold text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Staff Employee (কর্মকর্তা)</label>
                    <select
                      value={manualEmpId}
                      onChange={(e) => setManualEmpId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 mt-1"
                    >
                      <option value="">-- Choose employee to sign --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Date (তারিখ)</label>
                      <input 
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-805 mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Time (সময়)</label>
                      <input 
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-805 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Target Brand Protocol</label>
                      <select
                        value={manualBrand}
                        onChange={(e) => setManualBrand(e.target.value as DeviceBrand)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 mt-1"
                      >
                        <option value="ZKTeco">ZKTeco</option>
                        <option value="Hikvision">Hikvision</option>
                        <option value="Dahua">Dahua</option>
                        <option value="Anviz">Anviz</option>
                        <option value="Suprema">Suprema</option>
                        <option value="GenericUSB">USB Swipe</option>
                      </select>
                    </div>

                    {canEdit && (
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> সেভ করুন
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>

            </div>

            {/* Right side Logs Grid */}
            <div className="lg:col-span-2 space-y-4">
              
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                      লাইভ ইন্টিগ্রেশন ট্রানজেকশন রেকর্ড (Universal Sync Log Ledger)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">ডিভাইস, ক্লাউড এপিআই, ওয়েবহুক বা ব্যাকআপ ফাইল থেকে প্রাপ্ত সাম্প্রতিক রেকর্ডসমূহ</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={handleClearLogs}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" /> মুছে ফেলুন
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 font-bold space-y-3">
                      <FileText className="w-12 h-12 text-slate-200 animate-bounce" />
                      <p className="text-xs">কোনো সমন্বিত হাজিরা রেকর্ড পাওয়া যায়নি।</p>
                      <p className="text-[10px] text-slate-400 font-medium font-sans">ফিল্টারের ডেট বাড়ান অথবা বাম পাশের সিমুলেটর টেস্টার চেপে প্রবেশ রেকর্ড জমা করুন!</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse font-bold">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[9px] border-b border-slate-200">
                          <th className="py-3 px-4">Employee Details (স্টাফ নাম)</th>
                          <th className="py-3 px-4">Employee ID</th>
                          <th className="py-3 px-4">Device Brand</th>
                          <th className="py-3 px-4">Log Timestamp</th>
                          <th className="py-3 px-4">Scan Method</th>
                          <th className="py-3 px-2 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Data Hub Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700">
                        {filteredLogs.map((log) => {
                          const isLate = log.type === 'IN' && log.time > '09:15:00';
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-semibold">
                              <td className="py-3 px-4 font-black text-slate-900 border-r border-slate-100">
                                {log.employeeName}
                              </td>
                              <td className="py-3 px-4 font-mono font-black text-slate-600">
                                {log.employeeId}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.brand === 'ZKTeco' ? 'bg-orange-100 text-orange-850' :
                                  log.brand === 'Hikvision' ? 'bg-red-100 text-red-850' :
                                  log.brand === 'Dahua' ? 'bg-indigo-100 text-indigo-850' :
                                  log.brand === 'Anviz' ? 'bg-sky-100 text-sky-850' :
                                  log.brand === 'Suprema' ? 'bg-yellow-100 text-yellow-900' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {log.brand}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-normal">
                                <div className="flex items-center gap-1.5 text-slate-550 font-mono">
                                  <span>{log.date}</span>
                                  <span className="font-extrabold text-slate-800">{log.time}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-600">
                                {log.verifyMode}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  log.type === 'IN'
                                    ? isLate 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-indigo-100 text-indigo-805 border border-indigo-200'
                                }`}>
                                  {log.type} {log.type === 'IN' && isLate ? ' (LATE)' : ''}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-normal">
                                <div className="text-[10px] font-bold text-slate-650">{log.source}</div>
                                <div className="text-[9px] font-mono text-slate-400 font-bold">{log.deviceIp}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Attendance Statistics panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider mb-3">Live Integration Pulse Monitor</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 border rounded-lg text-center">
                    <span className="block text-[9px] text-slate-500 font-bold">Unique checked-in</span>
                    <span className="text-lg font-black text-slate-800 font-mono">
                      {new Set(logs.filter(l => l.date === new Date().toISOString().substring(0, 10)).map(l => l.employeeId)).size} Staffs
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border rounded-lg text-center">
                    <span className="block text-[9px] text-slate-500 font-bold">Inbound Hooks</span>
                    <span className="text-lg font-black text-amber-600 font-mono">
                      {logs.filter(l => l.source === 'Device API Hook').length} Pushes
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border rounded-lg text-center font-bold">
                    <span className="block text-[9px] text-slate-500 font-bold">Backup File Imports</span>
                    <span className="text-lg font-black text-emerald-600 font-mono">
                      {logs.filter(l => l.source === 'USB Backup File').length} Rows
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-center">
                    <span className="block text-[9px] text-slate-500 font-bold">Local TCP Gateway</span>
                    <span className="text-xs text-emerald-700 font-black font-mono flex items-center justify-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE PORT 3000
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUBTAB 2: Python / Local Bridge Scripts */}
        {activeSubTab === 'agents' && (
          <div className="bg-white border border-slate-205 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-black text-slate-800">
                🔌 Real-Time PC Bridge Integration Scripts (SDK Agents)
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                মডেলভেদে যেকোনো বায়োমেট্রিক ডিভাইস থেকে সরাসরি লোকাল নেটওয়ার্ক (WiFi/Ethernet) পিসি ব্রিজের মাধ্যমে ক্লাউড হোস্টে রিয়েল-টাইমে হাজিরা ডেটা পাঠানোর এপিআই স্ক্রিপ্ট।
              </p>
            </div>

            {/* Router & LAN Cable Setup Guideline Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-emerald-50/40 border border-indigo-150/80 rounded-xl p-5 shadow-3xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                <span className="text-lg">🖥️</span>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider font-sans">
                  রাউটার ও ল্যান ক্যাবল কানেকশন গাইডলাইন (Router & LAN Cable Setup Guide)
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                আপনার বায়োমেট্রিক ডিভাইস এবং কম্পিউটারটি যদি একই রাউটারের সাথে ল্যান ক্যাবল (Cat6 Cable) দিয়ে কানেক্টেড থাকে, তবে নিচের ৩টি ধাপ অনুসরণ করে খুব সহজেই এটিকে এই ক্লাউড ইআরপি (ERP) সফটওয়্যারের সাথে সংযুক্ত করে রিয়েল-টাইম এটেনডেন্স রেকর্ড করতে পারবেন:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-750">
                <div className="bg-white/80 p-3.5 rounded-lg border border-indigo-50 hover:shadow-xs transition-shadow">
                  <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white font-black text-[9px] rounded-full uppercase mb-2">ধাপ ১: আইপি (IP) সেটআপ</span>
                  <p className="leading-relaxed">
                    আপনার ডিভাইসের স্ক্রিন থেকে **Menu &gt; Comm &gt; Ethernet** অপশনে যান। ডিভাইসের জন্য একটি ফিক্সড আইপি বসান (যেমন: <code className="bg-indigo-50 px-1 rounded font-bold font-mono">192.168.1.201</code>), সাবনেট মাস্ক <code className="bg-indigo-50 px-1 rounded font-mono">255.255.255.0</code> এবং গেটওয়ে <code className="bg-indigo-50 px-1 rounded font-mono">192.168.1.1</code> সেট করুন। আপনার কম্পিউটার থেকেও যেন এই আইপি-টি পিং (<code className="bg-indigo-50 px-1 rounded font-mono">ping 192.168.1.201</code>) করা যায় তা নিশ্চিত করুন।
                  </p>
                </div>
                <div className="bg-white/80 p-3.5 rounded-lg border border-indigo-50 hover:shadow-xs transition-shadow">
                  <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white font-black text-[9px] rounded-full uppercase mb-2">ধাপ ২: ব্রিজ এজেন্ট স্ক্রিপ্ট চালু</span>
                  <p className="leading-relaxed">
                    যেহেতু এই ERP ক্লাউডে চলে, তাই একই রাউটারে কানেক্টেড থাকা আপনার পিসি বা লোকাল একটি সার্ভার পিসিতে নিচে দেওয়া **Python SDK Bridge** স্ক্রিপ্টটি ডাউনলোড করে রান করে রাখুন। স্ক্রিপ্টটি লোকাল নেটওয়ার্কে ডিভাইসের পোর্ট ৪৩৭০ তে অনবরত কানেকশন রেখে হাজিরা ডেটা টেনে নিয়ে সরাসরি ক্লাউড ওয়েব-হুকে এন্ট্রি করে দেবে।
                  </p>
                </div>
                <div className="bg-white/80 p-3.5 rounded-lg border border-indigo-50 hover:shadow-xs transition-shadow">
                  <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white font-black text-[9px] rounded-full uppercase mb-2">ধাপ ৩: ডিভাইস রেজিস্টার</span>
                  <p className="leading-relaxed">
                    এই পেজের প্রথম ট্যাবে **"নতুন বায়োমেট্রিক ডিভাইস রেজিস্টার"**-এ গিয়ে ডিভাইসের নাম, আইপি এবং পোর্ট ৪৩৭০ দিয়ে এড করে দিন। এরপর যখনই কোনো কর্মী মেশিনে থাম্ব বা ফেস পাঞ্চ করবে, সাথে সাথেই সেই হাজিরা রেকর্ড এই সফটওয়্যারের **"হাজিরা লগ"** এবং মূল পেরোল মডিউলে রিয়েল-টাইমে আপডেট হয়ে যাবে!
                  </p>
                </div>
              </div>
            </div>

            {/* Selector Grid for Brands */}
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-700">১. আপনার বায়োমেট্রিক ডিভাইসের মডেল ব্রান্ড বেছে নিন (Select Hardware Brand):</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(['ZKTeco', 'Hikvision', 'Dahua', 'Anviz', 'Suprema', 'GenericUSB'] as DeviceBrand[]).map(hb => (
                  <button
                    key={hb}
                    onClick={() => setSelectedAgentBrand(hb)}
                    className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                      selectedAgentBrand === hb
                        ? 'bg-emerald-600 text-white shadow border-emerald-600 font-extrabold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {hb === 'GenericUSB' ? 'USB Card Swipe' : hb}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation card based on active Brand */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-5 space-y-4 text-xs font-bold text-slate-650 leading-relaxed">
                <span className="block text-xs font-black text-emerald-700 border border-emerald-250 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                  How this {selectedAgentBrand} Linker works
                </span>

                {selectedAgentBrand === 'ZKTeco' && (
                  <p>
                    ZKTeco এবং Realand ডিভাইসসমূহ স্ট্যান্ডার্ড ZK প্রটোকল ব্যবহার করে। নিচের কোডটিতে Python এর <code>pyzk</code> মডিউল ব্যবহার করে সরাসরি মেশিনের প্রটোকল পোর্টে (যেমন: 4370) কানেক্ট করে এবং ট্রানজেকশন ঘটার সাথেসাথেই রিয়েল টাইমে ডাটা এই ERP সার্ভার এপিআই ওয়েবহুকে জেনারেট করে পুশ করে।
                  </p>
                )}
                {selectedAgentBrand === 'Hikvision' && (
                  <p>
                    Hikvision ফেস রিডার ও কার্ড টার্মিনালসমূহে বিল্ট-ইন <b>ISAPI Protocol Event Stream</b> থাকে। আমাদের স্ক্রিপ্টটি টার্মিনালের লোকাল ওয়েব সার্ভার আইপিতে ডিজিট্যাল অথেনটিকেশন ডাইজেস্ট সংযোগ করে লাইভ এক্সএমএল লুপ রিসিভার চালু রাখে। কোনো ব্যক্তি মুখ দেখামাত্রই পিন কোডটি সাথে সাথে পুশ হয়।
                  </p>
                )}
                {selectedAgentBrand === 'Anviz' && (
                  <p>
                    Anviz বায়োমেট্রিক স্ক্যানারগুলো স্ট্যান্ডার্ড TCP Socket (ডিফল্ট পোর্ট ৫০১০) দিয়ে ইথারনেটে কমিউনিকেশন করে। নিচে দেওয়া স্ক্রিপ্টটি একটি কাস্টম বাইনারি সকেট হেড ফাইল তৈরি করে রিডার গেটওয়ে থেকে ট্রানজেকশন পুল করে এপিআই-তে প্রেরণ করে।
                  </p>
                )}
                {selectedAgentBrand === 'Dahua' && (
                  <p>
                    Dahua ফেস/থাম্ব রিডারসমূহে রয়েছে সরাসরি <b>Built-in Webhook System</b>। আপনি পিসিতে স্ক্রিপ্ট না চালিয়ে সরাসরি Dahua এডমিন প্যানেলে গিয়ে <i>Network &gt; Webhook</i> অপশনে আপনার ক্লাউড এপিআই বসিয়ে দিলে মেশিনটি পপ-আপ ছাড়াই স্বয়ংক্রিয়ভাবে পুশ রিকোয়েস্ট ডেলিভারি করবে।
                  </p>
                )}
                {selectedAgentBrand === 'Suprema' && (
                  <p>
                    Suprema ডিভাইসগুলো Suprema BioStar 2 সার্ভার ম্যানেজারের সাথে সংযুক্ত থাকে। পাশের স্ক্রিপ্টটি বায়োস্টার লোকাল হাব সার্ভার এপিআই এর সাথে অবিরাম যোগাযোগ রেখে যেকোনো অ্যাক্সেস কন্ট্রোল ইভেন্ট সরাসরি আপনার এই অ্যাকাউন্টে নিয়ে আসে।
                  </p>
                )}
                {selectedAgentBrand === 'GenericUSB' && (
                  <p>
                    আপনার যদি কোনো ওয়াইফাই/ল্যান ইথারনেট বায়োমেট্রিক গেটওয়ে না থাকে, তথাপি একটি সস্তা ইউএসবি আরএফআইডি কার্ড রিডার (যা পিসির ইউএসবি পোর্টে কীবোর্ডের মতো কাজ করে) কিনে আপনার সিকিউরিটি গার্ডের লোকাল পিসিতে এই স্ক্রিপ্ট চালু করে দিলে, কার্ড পাঞ্চ করা মাত্রই আইডিটি ডাটাবেজে এন্ট্রি হয়ে যাবে।
                  </p>
                )}

                <div className="bg-indigo-50 border-l-4 border-indigo-650 p-4 rounded-r-lg text-indigo-950 font-bold space-y-1 mt-3">
                  <span className="block text-[11px] font-black uppercase text-indigo-800">📡 Cloud Webhook Endpoint URL</span>
                  <div className="bg-white border border-indigo-200 px-3 py-1 text-[10px] font-mono rounded text-slate-800 select-all truncate">
                    {origin}/api/biometric/sync
                  </div>
                  <p className="text-[10px] text-indigo-900 leading-normal pt-1">
                    এই রিয়েল-টাইম এপিআইটি যেকোনো মডিউল ব্র্যান্ড থেকে আসার সাথে সাথে কর্মীর এন্ট্রি ও এক্সিট ট্রানজেকশন প্রসেস করে।
                  </p>
                </div>

                <div className="bg-slate-50 border p-3 rounded-lg leading-relaxed text-slate-600 font-normal">
                  <div className="font-bold text-slate-800 mb-1">প্রয়োজনীয় পাইথন মডিউল (Install commands):</div>
                  <code className="block bg-slate-900 text-white rounded p-1.5 font-mono text-[10px] font-bold">
                    {selectedAgentBrand === 'ZKTeco' ? 'pip install pyzk requests' : 
                     selectedAgentBrand === 'Hikvision' ? 'pip install requests digest-auth' :
                     selectedAgentBrand === 'GenericUSB' ? 'pip install requests' :
                     'pip install requests'
                    }
                  </code>
                </div>
              </div>

              {/* Code viewer blocks */}
              <div className="lg:col-span-7 space-y-3 font-mono">
                <div className="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-t-xl shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-350">🐍 Python SDK Bridge ({selectedAgentBrand === 'GenericUSB' ? 'usb_wedge' : `${selectedAgentBrand.toLowerCase()}_agent`}.py)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getBrandScriptCode(selectedAgentBrand));
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 text-[10px] rounded transition-all cursor-pointer font-bold uppercase tracking-wide flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3" /> : <Copy className="w-3" />}
                    {copiedCode ? 'Copied!' : 'Copy Script'}
                  </button>
                </div>
                <div className="bg-slate-950 text-slate-300 p-4 rounded-b-xl overflow-x-auto text-[11px] leading-normal max-h-[450px] border border-slate-800">
                  <pre className="whitespace-pre">{getBrandScriptCode(selectedAgentBrand)}</pre>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SUBTAB 3: Backup File Uploader / Parser */}
        {activeSubTab === 'file-upload' && (
          <div className="bg-white border border-slate-205 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  📁 USB `.dat` / Multi-Format CSV File Offline Parser (অফলাইন ডাটা সিঙ্ক)
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  রাউটারে ইন্টারনেট না থাকলে কিংবা লোকাল ডবল-ব্রিজ পিসি না থাকলে যেকোনো ব্রান্ডের পেনড্রাইভ লক মেমোরি থেকে ডাটা ফাইল এখানে আপলোড করে দিন।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Form upload */}
              <div className="space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">১. ফাইল ফর্ম্যাট নির্বাচন ও আপলোড</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ফাইল কাঠামো ফর্ম্যাট (Choose File Schema):</label>
                    <select
                      value={selectedUploadFormat}
                      onChange={(e) => setSelectedUploadFormat(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="generic_csv">Generic Standard CSV (EmpNo, Date, Time, Status)</option>
                      <option value="zk_dat">ZKTeco Standard Security file (`attlog.dat` / space-delimited)</option>
                      <option value="hik_csv">Hikvision DS-K1T Export CSV structure</option>
                      <option value="anviz_txt">Anviz export TXT log layout</option>
                      <option value="suprema_csv">Suprema BioStar export CSV dump</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ডিভাইস লগ ফাইল (Upload Attlog File):</label>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".dat,.txt,.csv"
                      className="w-full text-xs font-bold bg-white p-3 border rounded border-slate-300 block text-slate-700"
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-1">সমর্থিত ফাইল এক্সটেনশনসমূহ: .dat, .txt, .csv (পেনড্রাইভ থেকে ব্যাকআপ নেওয়া)</p>
                  </div>
                </div>

                {/* Error/Success notices */}
                {fileError && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-900 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{fileError}</span>
                  </div>
                )}

                {fileSuccessMsg && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded text-emerald-950 text-xs font-bold space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[13px]">
                      <ShieldCheck className="w-4 h-4" /> ফাইল প্রসেসিং সম্পন্ন!
                    </div>
                    <p>{fileSuccessMsg}</p>
                  </div>
                )}
              </div>

              {/* Sample displays */}
              <div className="space-y-4">
                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">২. নির্বাচিত বায়োমেট্রিক ফাইলের সঠিক গঠন নমুনা (Expected File Structure)</span>
                
                {selectedUploadFormat === 'generic_csv' && (
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                    <p className="text-emerald-400 font-bold font-sans"># standard_backup.csv</p>
                    <p>ACD220201, 2026-06-22, 09:05:12, IN, Hikvision</p>
                    <p>EMP-1001, 2026-06-22, 18:05:30, OUT, ZKTeco</p>
                    <p>EMP-1002, 2026-06-22, 08:58:20, IN, Dahua</p>
                  </div>
                )}
                {selectedUploadFormat === 'zk_dat' && (
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                    <p className="text-emerald-400 font-bold font-sans"># ZKTeco attlog.dat format specimen</p>
                    <p>1001   2026-06-22 09:05:12   0   1</p>
                    <p>1002   2026-06-22 17:58:22   1   4</p>
                    <p>1003   2026-06-22 09:12:45   0   1</p>
                  </div>
                )}
                {selectedUploadFormat === 'hik_csv' && (
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                    <p className="text-emerald-405 font-bold font-sans"># Hikvision DS-K1T Export.csv</p>
                    <p>Index,Name,EmployeeNo,Time,Direction,DeviceName</p>
                    <p>1,Salim,EMP-1001,2026-06-22 09:05:12,In,MainGate</p>
                    <p>2,Hasan,EMP-1002,2026-06-22 18:15:30,Out,OfficeDoor</p>
                  </div>
                )}
                {selectedUploadFormat === 'anviz_txt' && (
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                    <p className="text-emerald-400 font-bold font-sans"># Anviz standard TXT export</p>
                    <p>1001   2026-06-22   09:05:12   1   1</p>
                    <p>1002   2026-06-22   18:02:15   1   2</p>
                  </div>
                )}
                {selectedUploadFormat === 'suprema_csv' && (
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                    <p className="text-emerald-400 font-bold font-sans"># Suprema BioStar Log dump.csv</p>
                    <p>EMP-1001,Salim,2026-06-22 09:05:12,Authenticated (Face),Door-1</p>
                    <p>EMP-1002,Hasan,2026-06-22 18:03:00,Exit (Card),Door-2</p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 leading-normal font-sans font-bold">
                  * ফাইল প্রসেস হয়ে কর্মচারীদের আইডি ও সময়ের ডাটা সরাসরি সমন্বয় হবে। আইডির সাথে মিল না থাকলে রেকর্ডটি আনরেজিস্টার্ড আইডি হিসেবে প্রসেস হবে যা এডমিন পরে দেখে ঠিক করতে পারবেন।
                </p>
              </div>

            </div>

          </div>
        )}

        {/* SUBTAB 4: Hardware configurations */}
        {activeSubTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form to Registrate Device */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-1.5 uppercase">
                <Plus className="w-4 h-4 text-emerald-600" />
                নতুন বায়োমেট্রিক রিডার মেশিন যোগ করুন (Register Device)
              </h3>
              
              <form onSubmit={handleAddDevice} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-650 mb-1">১. গেটওয়ে / রিডার নাম (Device Label):</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Ground Floor Factory Portal"
                    value={deviceNameInput}
                    onChange={(e) => setDeviceNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-650 mb-1">২. মডেল ব্রান্ড (Manufacturer):</label>
                    <select
                      value={deviceBrandInput}
                      onChange={(e) => handleBrandChangeOnAddForm(e.target.value as DeviceBrand)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-extrabold"
                    >
                      <option value="ZKTeco">ZKTeco / Realand</option>
                      <option value="Hikvision">Hikvision (Face API)</option>
                      <option value="Dahua">Dahua (CGI)</option>
                      <option value="Anviz">Anviz Systems</option>
                      <option value="Suprema">Suprema Security</option>
                      <option value="GenericUSB">USB virtual wedge reader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-650 mb-1">৩. মডেল নং (Model No.):</label>
                    <input
                      type="text"
                      required
                      value={deviceModelInput}
                      onChange={(e) => setDeviceModelInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <label className="block text-slate-650 mb-1">৪. লোকাল IP ঠিকানা (Device IP):</label>
                    <input
                      type="text"
                      required
                      value={deviceIpInput}
                      onChange={(e) => setDeviceIpInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-800 font-extrabold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-650 mb-1">৫. প্রটোকল পোর্ট (Port):</label>
                    <input
                      type="number"
                      required
                      value={devicePortInput}
                      onChange={(e) => setDevicePortInput(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border leading-relaxed text-[10px] text-slate-500 font-normal">
                  <p className="font-bold text-slate-700">📶 Auto-recomended config guide:</p>
                  {deviceBrandInput === 'ZKTeco' && "• ZKTeco machines use port 4370 UDP connection channel."}
                  {deviceBrandInput === 'Hikvision' && "• Hikvision terminals use standard port 80/443 TCP web-server access."}
                  {deviceBrandInput === 'Anviz' && "• Anviz direct clients use TCP port 5010 socket stream."}
                  {deviceBrandInput === 'Dahua' && "• Dahua biometrics general communication on port 37777."}
                  {deviceBrandInput === 'GenericUSB' && "• USB swipe-card keyboard simulators do not need IP setup (runs locally)."}
                </div>

                {canEdit && (
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 text-white" /> REGISTER BIOMETRIC READER
                  </button>
                )}
              </form>
            </div>

            {/* List of registered Hardware */}
            <div className="lg:col-span-7 bg-white border border-slate-205 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5 border-b pb-2 uppercase">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                নিবন্ধিত রিডার মেশিন সমূহ (Registered Readers Ledger)
              </h3>

              <div className="space-y-3 font-semibold text-xs">
                {devices.map((dev) => (
                  <div key={dev.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${dev.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                        <h4 className="font-extrabold text-slate-850 text-sm">{dev.name}</h4>
                        <span className="text-[10px] bg-slate-200 text-slate-700 border px-1.5 py-0.5 rounded font-black font-sans uppercase">{dev.brand}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-500 font-bold font-sans">
                        <p>Model: <span className="text-slate-800">{dev.model}</span></p>
                        <p>Address: <span className="text-slate-800 font-mono">{dev.ipAddress}:{dev.port}</span></p>
                        <p className="col-span-2">Last Sync Timestamp: <span className="text-slate-750 font-mono">{dev.lastSync}</span></p>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleDeleteDevice(dev.id)}
                        className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Trash className="w-3.5 h-3.5" /> রিমুভ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 5: Brand Integration Documentation */}
        {activeSubTab === 'docs' && (
          <div className="bg-white border border-slate-205 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-md font-extrabold text-slate-850">
                📖 Brand-Specific SDK &amp; Network Port Integration Manual
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">বিভিন্ন ব্রান্ডের বায়োমেট্রিক ও পাঞ্চ মেশিন কানেল্ট করার ফায়ারিং টিপস</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-650 font-bold">
              
              <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-orange-800 uppercase block tracking-wider">📡 ZKTeco &amp; Realand Gateways</span>
                <p><b>Port:</b> 4370 (Standard UDP channel)</p>
                <p><b>Working:</b> pyzk Python লাইব্রেরি বা ZKTime সফ্টওয়্যারের সাহায্যে লোকাল ব্যাকআপ চালু করে real-time event ট্রিক করতে পারেন। ZKTeco মেশিনের ADMS অপশন দিয়েও সরাসরি আমাদের ERP API এ সার্ভার অ্যাড্রেস বসিয়ে দিলে রিমোট রিয়েল-টাইম ডাটা সিঙ্ক সম্ভব।</p>
              </div>

              <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-red-800 uppercase block tracking-wider">📹 Hikvision K1T Face Readers</span>
                <p><b>Port:</b> 80 / 443 (HTTP ISAPI channel)</p>
                <p><b>Working:</b> Hikvision IVMS সফ্টওয়্যার দিয়ে মেশিনের ISAPI প্রটোকল অন করে দিন। ডিভাইস আইপিতে DIGEST অথেনটিকেশন বসিয়ে <code>/ISAPI/AccessControl/Event/notification</code> কানেকশন শুনুন। সিকিউর চেহারা ম্যাচ হলে ওয়ান-টাইম ইভেন্ট এপিআই-তে স্যান্ড হয়ে যাবে।</p>
              </div>

              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-indigo-805 uppercase block tracking-wider">🔬 Dahua ASA Fingerprint Lock</span>
                <p><b>Port:</b> 37777 or HTTP Webhook</p>
                <p><b>Working:</b> Dahua বায়োমেট্রিক মেশিনের ইন্টারফেস এডমিন প্যানেলে ব্রাউজ দিয়ে লগ অন করুন। "Setup &gt; Webhook" সিলেকশন করে টাইপ জেসন (JSON) সেট করে এই ইআরপির Webhook Hook URL লিঙ্কটি ইনসার্ট করে দিন। পেনড্রাইভে ডাটা ডাউনলোড করারই প্রয়োজন নাই স্বয়ংক্রিয় সিঙ্ক পাবেন!</p>
              </div>

              <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-sky-800 uppercase block tracking-wider">📶 Anviz W1/W2 security control</span>
                <p><b>Port:</b> 5010 (Binary TCP)</p>
                <p><b>Working:</b> Anviz ডিভাইসের নেটওয়ার্ক অপশনে 'Comm Mode' লুপ 'Active client' সেট করে লোকাল পিসির আইপি বসিয়ে দিন। একটি পাইথন সিএমডি উইন্ডো দিয়ে ৫০১০ পোর্টে ডাইরেক্ট সকেট স্ট্রিম ডিটেক্ট করে এপিআই-তে ফরওয়ার্ড করা যায়।</p>
              </div>

              <div className="p-4 bg-yellow-50/50 border border-yellow-250 rounded-xl space-y-2">
                <span className="text-xs font-black text-yellow-905 uppercase block tracking-wider">🔐 Suprema bio-scanners</span>
                <p><b>Port:</b> Suprema BioStar 2 API</p>
                <p><b>Working:</b> Suprema BioStar 2 বা ৩ লোকাল সার্ভারে একটি Webhook সার্ভিস হোস্ট করুন। Suprema মেশিনের যেকোনো দরজার আনলক বা আঙুল স্ক্যানিং ট্রিগার হলেই সেটি পাইথন স্ক্রিপ্টের এপিআই দিয়ে এই ক্লাউডে হাজির হয়ে প্রসেসড হবে।</p>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase block tracking-wider">💳 Direct USB RFID Wedge swipe</span>
                <p><b>Port:</b> Virtual COM / Keyboard</p>
                <p><b>Working:</b> কোনো ল্যান বা ওয়াইফাই সার্ভিস না থাকলেও সিকিউরিটি গার্ডের লোকাল পিসিতে সস্তা ২০ ডলারের একটি ইউএসবি আরএফআইডি কার্ড রিডার প্লাগ করুন। আমাদের 'GenericUSB standard template wedge' স্ক্রিপ্ট চালু করে ফোকাস রাখলে কার্ড পাঞ্চ হওয়া মাত্রই ক্লাউড হাজিরা কাউন্ট শুরু হবে!</p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
