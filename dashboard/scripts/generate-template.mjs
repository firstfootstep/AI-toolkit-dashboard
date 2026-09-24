import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "public", "templates", "trading-journal-template.xlsx");

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Trading Journal");

sheet.columns = [
  { header: "date", key: "date", width: 12 },
  { header: "symbol", key: "symbol", width: 10 },
  { header: "side", key: "side", width: 8 },
  { header: "quantity", key: "quantity", width: 10 },
  { header: "price", key: "price", width: 10 },
  { header: "fees", key: "fees", width: 8 },
  { header: "notes", key: "notes", width: 30 },
];

sheet.getRow(1).font = { bold: true };

sheet.addRows([
  { date: "2026-01-05", symbol: "AAPL", side: "BUY", quantity: 10, price: 182.4, fees: 1.5, notes: "Initial position" },
  { date: "2026-02-14", symbol: "AAPL", side: "BUY", quantity: 5, price: 188.1, fees: 1.5, notes: "Adding on dip" },
  { date: "2026-03-20", symbol: "VOO", side: "BUY", quantity: 8, price: 452.0, fees: 1.0, notes: "Monthly DCA" },
  { date: "2026-04-02", symbol: "AAPL", side: "SELL", quantity: 3, price: 195.6, fees: 1.5, notes: "Trimming position" },
]);

await workbook.xlsx.writeFile(outPath);
console.log(`Template written to ${outPath}`);
