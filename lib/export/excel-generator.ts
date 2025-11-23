import * as XLSX from 'xlsx';

export const generateVouchersExcel = (vouchers: any[]): Blob => {
  // Map data to a flat structure suitable for Excel
  const data = vouchers.map(v => ({
    "Voucher No": v.voucher_no,
    "Payee Name": v.payee_name,
    "Date": new Date(v.created_at).toLocaleDateString('en-MY'),
    "Total Amount (RM)": typeof v.total_amount === 'number' ? v.total_amount : parseFloat(v.total_amount),
    "Status": v.status,
    "ID": v.id
  }));

  // Create a worksheet from the JSON data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Define column widths
  const wscols = [
    { wch: 20 }, // Voucher No
    { wch: 30 }, // Payee Name
    { wch: 15 }, // Date
    { wch: 18 }, // Total Amount
    { wch: 15 }, // Status
    { wch: 10 }  // ID
  ];
  worksheet['!cols'] = wscols;

  // Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vouchers");

  // Generate Excel buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Return as Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};