import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  X, 
  FileSpreadsheet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';
import { PatientRecord, SpreadsheetConfig } from '../types/dialysis';
import { DEFAULT_APPS_SCRIPT_URL, OFFICIAL_SPREADSHEET_URL, sanitizeAppsScriptUrl } from '../services/googleSheets';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  spreadsheetConfig: SpreadsheetConfig | null;
  onSaveSpreadsheetConfig: (config: SpreadsheetConfig) => void;
  patients: PatientRecord[];
  onPullFromSheet?: (spreadsheetId: string) => Promise<void>;
  onPushToSheet?: (spreadsheetId: string) => Promise<void>;
  onPullViaAppsScript: (url: string) => Promise<void>;
  onPushViaAppsScript: (url: string) => Promise<void>;
  onImportCsv?: (csvText: string) => void;
  onSignIn?: () => void;
  onOpenExportExcelModal?: () => void;
  selectedMonth: string;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
}

const formatDateTimeIndo = (isoStr?: string): string => {
  if (!isoStr) return 'Belum pernah disinkronkan';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch (e) {
    return isoStr;
  }
};

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  spreadsheetConfig,
  onSaveSpreadsheetConfig,
  patients,
  onPullViaAppsScript,
  onPushViaAppsScript,
}) => {
  // Input states - Default to target official Web App URL
  const [appsScriptUrl, setAppsScriptUrl] = useState(
    spreadsheetConfig?.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL
  );
  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState(
    spreadsheetConfig?.spreadsheetUrl || OFFICIAL_SPREADSHEET_URL
  );

  // Operation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Perbarui nilai input sesuai konfigurasi aktif saat modal dibuka
  React.useEffect(() => {
    if (isOpen) {
      setAppsScriptUrl(spreadsheetConfig?.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL);
      setSpreadsheetUrlInput(spreadsheetConfig?.spreadsheetUrl || OFFICIAL_SPREADSHEET_URL);
    }
  }, [isOpen, spreadsheetConfig]);

  if (!isOpen) return null;

  // Simpan URL Apps Script jika perlu
  const handleSaveAppsScriptUrl = () => {
    const raw = appsScriptUrl.trim() || DEFAULT_APPS_SCRIPT_URL;
    const targetUrl = sanitizeAppsScriptUrl(raw) || DEFAULT_APPS_SCRIPT_URL;
    setAppsScriptUrl(targetUrl);
    if (!targetUrl.startsWith('http')) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Masukkan Web App URL Apps Script yang valid (diawali https://script.google.com/...)' 
      });
      return;
    }
    const updated: SpreadsheetConfig = {
      spreadsheetId: spreadsheetConfig?.spreadsheetId || 'appsscript-connected',
      sheetName: 'Senin-Kamis, Selasa-Jumat, Rabu-Sabtu',
      appsScriptUrl: targetUrl,
      syncMode: 'appsscript',
      lastSyncedAt: new Date().toISOString(),
    };
    onSaveSpreadsheetConfig(updated);
  };

  // Tarik via Apps Script (Tanpa Login)
  const handlePullAppsScript = async () => {
    const url = appsScriptUrl.trim() || spreadsheetConfig?.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (!url) {
      setStatusMessage({ type: 'error', text: 'Masukkan Web App URL Apps Script terlebih dahulu.' });
      return;
    }
    try {
      setIsProcessing(true);
      setStatusMessage({ type: 'info', text: 'Menghubungi Apps Script dan membaca data...' });
      await onPullViaAppsScript(url);
      handleSaveAppsScriptUrl();
      setStatusMessage({ type: 'success', text: 'Berhasil membaca data alokasi dari Google Sheet!' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Gagal terhubung dengan Apps Script.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Kirim via Apps Script (Tanpa Login)
  const handlePushAppsScript = async () => {
    const url = appsScriptUrl.trim() || spreadsheetConfig?.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (!url) {
      setStatusMessage({ type: 'error', text: 'Masukkan Web App URL Apps Script terlebih dahulu.' });
      return;
    }
    try {
      setIsProcessing(true);
      setStatusMessage({ type: 'info', text: 'Mengirimkan data alokasi pasien ke Google Sheet...' });
      await onPushViaAppsScript(url);
      handleSaveAppsScriptUrl();
      setStatusMessage({ type: 'success', text: `Sukses menyimpan ${patients.length} data pasien ke Google Sheet!` });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengirim ke Apps Script.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md sm:max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Sinkronisasi Google Sheets
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Alokasi 2 Arah &amp; Jadwal Hemodialisa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* Status Singkat & Terakhir Disinkronkan */}
          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${spreadsheetConfig?.lastSyncedAt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <div className="truncate text-[11px] sm:text-xs">
                <span className="text-slate-500 dark:text-slate-400">Terakhir: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateTimeIndo(spreadsheetConfig?.lastSyncedAt)}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shrink-0">
              {patients.length} Pasien
            </span>
          </div>

          {/* Notifikasi Status (jika sedang proses / sukses / gagal) */}
          {statusMessage && (
            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800'
                : 'bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
            }`}>
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400 animate-spin" />}
              <span className="font-medium leading-relaxed text-[11px] sm:text-xs">{statusMessage.text}</span>
            </div>
          )}

          {/* 3 TOMBOL BESAR UTAMA */}
          <div className="space-y-3 pt-1">
            
            {/* 1. TOMBOL BESAR: TARIK DATA */}
            <button
              type="button"
              onClick={handlePullAppsScript}
              disabled={isProcessing}
              className="w-full p-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition shadow-md hover:shadow-lg flex items-center justify-between gap-3.5 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 group-hover:bg-white/25 flex items-center justify-center shrink-0 shadow-inner">
                  {isProcessing ? (
                    <RefreshCw className="w-5.5 h-5.5 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="w-5.5 h-5.5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-base sm:text-lg font-black tracking-wide">
                    {isProcessing ? 'SEDANG MENARIK DATA...' : 'TARIK DATA'}
                  </div>
                  <div className="text-xs text-blue-100 font-normal mt-0.5">
                    Ambil data alokasi &amp; jadwal terbaru dari Google Sheet
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-900/60 px-3 py-1.5 rounded-lg shrink-0 group-hover:bg-blue-900/80 transition">
                PULL
              </span>
            </button>

            {/* 2. TOMBOL BESAR: KIRIM DATA */}
            <button
              type="button"
              onClick={handlePushAppsScript}
              disabled={isProcessing}
              className="w-full p-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 transition shadow-md hover:shadow-lg flex items-center justify-between gap-3.5 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 group-hover:bg-white/25 flex items-center justify-center shrink-0 shadow-inner">
                  {isProcessing ? (
                    <RefreshCw className="w-5.5 h-5.5 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="w-5.5 h-5.5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-base sm:text-lg font-black tracking-wide">
                    {isProcessing ? 'SEDANG MENGIRIM DATA...' : 'KIRIM DATA'}
                  </div>
                  <div className="text-xs text-emerald-100 font-normal mt-0.5">
                    Kirim {patients.length} data pasien &amp; alokasi ke Google Sheet
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-900/60 px-3 py-1.5 rounded-lg shrink-0 group-hover:bg-emerald-900/80 transition">
                PUSH
              </span>
            </button>

            {/* 3. TOMBOL BESAR: BUKA SHEET */}
            <a
              href={spreadsheetUrlInput || spreadsheetConfig?.spreadsheetUrl || OFFICIAL_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition shadow-md hover:shadow-lg flex items-center justify-between gap-3.5 cursor-pointer group"
              title="Buka dokumen Google Sheets langsung di tab baru"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 group-hover:bg-white/25 flex items-center justify-center shrink-0 shadow-inner">
                  <FileSpreadsheet className="w-5.5 h-5.5" />
                </div>
                <div className="text-left">
                  <div className="text-base sm:text-lg font-black tracking-wide">
                    BUKA SHEET
                  </div>
                  <div className="text-xs text-indigo-100 font-normal mt-0.5">
                    Buka spreadsheet 5 lembar kerja resmi di Google Drive
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold bg-indigo-900/60 px-3 py-1.5 rounded-lg shrink-0 group-hover:bg-indigo-900/80 transition">
                <span>BUKA</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {spreadsheetConfig?.lastSyncedAt 
              ? `Sinkron: ${new Date(spreadsheetConfig.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` 
              : 'Siap sinkronisasi'}
          </span>
          <button
            onClick={onClose}
            className="h-8.5 px-4 rounded-lg font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
