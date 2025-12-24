
import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, ArrowRight, RefreshCw, Trash2, Settings as SettingsIcon, FileArchive, Database, Lock, Key, TableProperties, ArrowRightCircle, List, AlertTriangle, Calendar } from 'lucide-react';
import { BrokerageTransaction, TransactionStatus, TransactionSource, TeamMember, Role, ImportBatch, Client } from '../types';
import * as XLSX from 'xlsx';
import { useData } from '../contexts/DataContext';

interface ImportsProps {
    currentUser: TeamMember;
}

const SYSTEM_FIELDS = [
    { key: 'folio', label: 'Folio Number', required: true },
    { key: 'pan', label: 'PAN', required: true },
    { key: 'investorName', label: 'Investor Name', required: true },
    { key: 'amcName', label: 'AMC Name', required: true },
    { key: 'schemeName', label: 'Scheme Name', required: true },
    { key: 'transactionDate', label: 'Transaction Date', required: true },
    { key: 'grossAmount', label: 'Gross Brokerage', required: true },
    { key: 'currentValue', label: 'Current Value (AUM)', required: false },
    { key: 'brokerageRate', label: 'Brokerage Rate (%)', required: false },
    { key: 'remarks', label: 'Transaction Type', required: false },
];

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

export const Imports: React.FC<ImportsProps> = ({ currentUser }) => {
  const { addTransactions, addBatch, clients, upsertClients, team, batches } = useData();

  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [importStage, setImportStage] = useState<'UPLOAD' | 'HEADER_SELECTION' | 'MAPPING' | 'PREVIEW'>('UPLOAD');
  
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [previewData, setPreviewData] = useState<BrokerageTransaction[] | null>(null);
  const [newClientsFound, setNewClientsFound] = useState<Client[]>([]);
  const [autoMapStats, setAutoMapStats] = useState({ mapped: 0, total: 0 });
  
  const [selectedSource, setSelectedSource] = useState<TransactionSource | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawFileContent, setRawFileContent] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (val: any): string => {
      if (!val) return new Date().toISOString().split('T')[0];
      const str = String(val).trim();
      
      if (!isNaN(val) && typeof val === 'number') {
          const date = new Date((val - 25569) * 86400 * 1000);
          return date.toISOString().split('T')[0];
      }

      const dmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (dmyMatch) {
          const [_, d, m, y] = dmyMatch;
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
      }

      return str;
  };

  const handleSourceSelect = (source: TransactionSource) => {
    setSelectedSource(source);
    setImportStage('UPLOAD');
    setUploadedFile(null);
    setPreviewData(null);
    setRawFileContent([]);
    setColumnMapping({});
  };

  const handleBoxClick = () => {
    if (!selectedSource) {
      alert("Please select a source (CAMS or KFintech) first.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) readFileContent(file);
  };

  const readFileContent = (file: File) => {
      setUploadedFile(file);
      setProcessing(true);
      setProcessingStep('Reading data...');

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              
              if (jsonData.length === 0) {
                  alert("File appears to be empty.");
                  setProcessing(false);
                  return;
              }

              setRawFileContent(jsonData);
              
              let detectedIndex = 0;
              const keywords = ['folio', 'pan', 'investor', 'brokerage', 'gross', 'scheme', 'date', 'amc'];
              for(let i=0; i<Math.min(jsonData.length, 25); i++) {
                  if (!jsonData[i]) continue;
                  const rowStr = jsonData[i].map(c => String(c).toLowerCase()).join(' ');
                  if (keywords.filter(k => rowStr.includes(k)).length >= 3) {
                      detectedIndex = i;
                      break;
                  }
              }
              setHeaderRowIndex(detectedIndex);
              setProcessing(false);
              setImportStage('HEADER_SELECTION');
          } catch (error) {
              alert("Error parsing file.");
              setProcessing(false);
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const confirmHeaderRow = () => {
      const headers = rawFileContent[headerRowIndex].map(h => String(h || '').trim()).filter(h => h);
      setFileHeaders(headers);
      
      const initialMapping: Record<string, string> = {};
      SYSTEM_FIELDS.forEach(field => {
          const match = headers.find(h => 
              h.toLowerCase() === field.label.toLowerCase() ||
              h.toLowerCase().includes(field.key.toLowerCase()) || 
              (field.key === 'grossAmount' && (h.toLowerCase().includes('gross') || h.toLowerCase().includes('amount'))) ||
              (field.key === 'transactionDate' && h.toLowerCase().includes('date')) ||
              (field.key === 'amcName' && h.toLowerCase().includes('amc')) ||
              (field.key === 'currentValue' && (h.toLowerCase().includes('value') || h.toLowerCase().includes('aum')))
          );
          if (match) initialMapping[field.key] = match;
      });
      setColumnMapping(initialMapping);
      setImportStage('MAPPING');
  };

  const processData = () => {
    setProcessing(true);
    setProcessingStep('Mapping and Validating...');
    
    setTimeout(() => {
        const transactions: BrokerageTransaction[] = [];
        const foundNewClients: Record<string, Client> = {};
        const batchId = `${selectedSource}_${Date.now()}`;
        const mapIndices: Record<string, number> = {};
        const headerRow = rawFileContent[headerRowIndex];
        
        SYSTEM_FIELDS.forEach(f => {
            if (columnMapping[f.key]) {
                mapIndices[f.key] = headerRow.findIndex(h => String(h || '').trim() === columnMapping[f.key]);
            }
        });

        let mappedCount = 0;
        const period = `${selectedYear}-${selectedMonth}`;

        for (let i = headerRowIndex + 1; i < rawFileContent.length; i++) {
            const row = rawFileContent[i];
            if (!row || row.length === 0) continue;

            const folio = String(row[mapIndices['folio']] || '');
            const pan = String(row[mapIndices['pan']] || '').toUpperCase().trim();
            const investorName = String(row[mapIndices['investorName']] || 'Unknown');
            
            const parseNum = (val: any) => {
              if (typeof val === 'number') return val;
              return parseFloat(String(val || '0').replace(/,/g, '')) || 0;
            };

            const gross = parseNum(row[mapIndices['grossAmount']]);
            const currentValue = parseNum(row[mapIndices['currentValue']]);
            const brokerageRate = parseNum(row[mapIndices['brokerageRate']]);
            
            if (!pan && !folio && gross === 0) continue;

            const txDate = parseDate(row[mapIndices['transactionDate']]);
            const amcName = String(row[mapIndices['amcName']] || 'Unknown AMC');

            let matchedClient = clients.find(c => 
                (pan && c.pan.toUpperCase() === pan) || 
                (folio && c.folios.includes(folio))
            );

            if (!matchedClient && pan) {
                if (foundNewClients[pan]) {
                    matchedClient = foundNewClients[pan];
                    if (folio && !matchedClient.folios.includes(folio)) {
                        matchedClient.folios.push(folio);
                    }
                } else {
                    const newClient: Client = {
                        id: `c_auto_${pan}`,
                        pan,
                        name: investorName,
                        folios: folio ? [folio] : [],
                        hierarchy: {
                            level6Id: '',
                            level5Id: '',
                            level4Id: '',
                            level3Id: '',
                            level2Id: '',
                            level1Id: 'tm6'
                        }
                    };
                    foundNewClients[pan] = newClient;
                    matchedClient = newClient;
                }
            }

            if (matchedClient) mappedCount++;

            transactions.push({
                id: `${batchId}_tx_${i}`,
                batchId,
                source: selectedSource!,
                uploadDate: new Date().toISOString(),
                transactionDate: txDate,
                brokeragePeriod: period,
                folio,
                pan,
                investorName,
                amcName,
                schemeName: String(row[mapIndices['schemeName']] || 'Unknown Scheme'),
                category: 'Equity', 
                grossAmount: gross,
                currentValue,
                brokerageRate,
                remarks: String(row[mapIndices['remarks']] || ''),
                mappedClientId: matchedClient?.id,
                status: TransactionStatus.VALIDATED
            });
        }
        setPreviewData(transactions);
        setNewClientsFound(Object.values(foundNewClients));
        setAutoMapStats({ mapped: mappedCount, total: transactions.length });
        setProcessing(false);
        setImportStage('PREVIEW');
    }, 600);
  };

  const handleConfirmImport = () => {
      if (!previewData) return;
      
      if (newClientsFound.length > 0) {
          upsertClients(newClientsFound);
      }
      addTransactions(previewData);
      
      const totalGross = previewData.reduce((acc, curr) => acc + curr.grossAmount, 0);
      addBatch({
          id: previewData[0].batchId,
          fileName: uploadedFile?.name || 'Import',
          uploadDate: new Date().toISOString(),
          status: TransactionStatus.APPROVED,
          totalLines: previewData.length,
          totalGross,
          unmappedCount: previewData.length - autoMapStats.mapped
      });
      
      alert(`Imported ${previewData.length} records for period ${previewData[0].brokeragePeriod}.`);
      setActiveTab('history');
      clearUpload();
      setSelectedSource(null);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setPreviewData(null);
    setNewClientsFound([]);
    setRawFileContent([]);
    setImportStage('UPLOAD');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Import</h1>
            <p className="text-sm text-slate-500">Processing brokerage files with AMC tracking.</p>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('import')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'import' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}>New Upload</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}>Batch History</button>
        </div>
      </div>

      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-opacity ${importStage !== 'UPLOAD' ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center"><span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span>Select Source & Period</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[TransactionSource.CAMS, TransactionSource.KFINTECH].map(src => (
                    <button key={src} onClick={() => handleSourceSelect(src)} className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition ${selectedSource === src ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        <span className="font-bold">{src}</span>
                    </button>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center"><Calendar className="w-3 h-3 mr-1" /> Brokerage Month</label>
                <div className="grid grid-cols-2 gap-2">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded-lg p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500">
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded-lg p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
              </div>
            </div>

            <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-opacity ${importStage !== 'UPLOAD' && importStage !== 'HEADER_SELECTION' ? 'opacity-50' : ''}`}>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center"><span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">2</span>Upload File</h3>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls,.dbf" onChange={handleFileChange} />
              {!uploadedFile ? (
                <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${!selectedSource ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'}`} onClick={handleBoxClick}>
                    <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium text-sm">Upload Spreadsheet</p>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold truncate max-w-[120px]">{uploadedFile.name}</span>
                        <button onClick={clearUpload} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {processing ? <div className="text-xs text-blue-600 animate-pulse">{processingStep}</div> : <div className="text-xs text-green-600 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Ready</div>}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 min-h-[400px]">
            {importStage === 'HEADER_SELECTION' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-bold text-slate-900">Define Header Row</h3>
                       <button onClick={confirmHeaderRow} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Use Row {headerRowIndex+1} <ArrowRight className="inline w-4 h-4 ml-1" /></button>
                   </div>
                   <div className="overflow-auto flex-1">
                       <table className="w-full text-xs text-left whitespace-nowrap">
                           <tbody>
                               {rawFileContent.slice(0, 15).map((row, idx) => (
                                   <tr key={idx} onClick={() => setHeaderRowIndex(idx)} className={`cursor-pointer border-b border-slate-100 ${idx === headerRowIndex ? 'bg-blue-50 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-50'}`}>
                                       <td className="px-4 py-3 bg-slate-100 border-r border-slate-200 text-slate-400 font-mono">{idx + 1}</td>
                                       {row.map((cell: any, ci: number) => <td key={ci} className="px-4 py-3 truncate max-w-[120px]">{cell}</td>)}
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
            )}

            {importStage === 'MAPPING' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Map Columns</h3>
                        <button onClick={processData} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Validate Records <ArrowRightCircle className="inline w-4 h-4 ml-1" /></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto">
                        {SYSTEM_FIELDS.map(field => (
                            <div key={field.key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                                <span className="text-sm font-medium text-slate-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                <select value={columnMapping[field.key] || ''} onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))} className="w-1/2 border rounded-lg px-3 py-2 text-sm bg-white">
                                    <option value="">-- Unmapped --</option>
                                    {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {importStage === 'PREVIEW' && previewData && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">Preview (First 100)</h3>
                    <p className="text-xs text-slate-500">{previewData.length} records for {previewData[0].brokeragePeriod}.</p>
                  </div>
                  <button onClick={handleConfirmImport} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-green-700">Confirm & Import</button>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Investor / AMC</th>
                        <th className="px-4 py-3">Scheme</th>
                        <th className="px-4 py-3 text-right">AUM (₹)</th>
                        <th className="px-4 py-3 text-right">Brokerage (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.slice(0, 100).map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{row.investorName}</span>
                                <span className="text-[10px] text-slate-500 uppercase">{row.amcName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{row.schemeName}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{(row.currentValue || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">₹{row.grossAmount.toLocaleString()}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importStage === 'UPLOAD' && (
              <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-10 text-slate-400">
                <Database className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-medium text-center">Upload spreadsheet to start brokerage mapping.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Import Date</th>
                        <th className="px-6 py-4 text-center">Rows</th>
                        <th className="px-6 py-4 text-right">Total Brokerage</th>
                        <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {batches.map(batch => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{batch.fileName}</td>
                            <td className="px-6 py-4 text-slate-500">{new Date(batch.uploadDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-center">{batch.totalLines}</td>
                            <td className="px-6 py-4 text-right font-bold">₹ {batch.totalGross.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 uppercase tracking-tighter">Processed</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};
