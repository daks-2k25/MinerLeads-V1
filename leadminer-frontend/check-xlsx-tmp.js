const ExcelJS = require("exceljs");
const path = require("path");

const filePath = path.join(__dirname, "leads_check.xlsx");

const wb = new ExcelJS.Workbook();
wb.xlsx.readFile(filePath).then(() => {
  const sheet = wb.getWorksheet("Leads");
  console.log("A1:", sheet.getCell(1, 1).value, sheet.getCell(1, 1).font);
  console.log("A2:", sheet.getCell(2, 1).value);
  console.log("Header row 4:", sheet.getRow(4).values);
  console.log("Row5 (first data):", sheet.getRow(5).values);
  console.log(
    "Row5 capturadoEm numFmt/text:",
    sheet.getRow(5).getCell(8).numFmt,
    sheet.getRow(5).getCell(8).text
  );
  console.log("AutoFilter:", sheet.autoFilter);
  console.log("Views:", sheet.views);
  console.log(
    "Column widths:",
    sheet.columns.map((c) => c && c.width)
  );
});
