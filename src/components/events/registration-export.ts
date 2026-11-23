import type { Registration } from "./registration-review";

const columns = ["Team code", "Team", "College", "City", "Track", "Registration status", "Payment status", "Payment reference", "Submitted (UTC)", "Verified (UTC)", "Email status", "Rejection reason", "Member", "Role", "Email", "Phone", "Branch / year"];

function teamFields(r: Registration) {
  return [r.teamCode, r.teamName, r.institution, r.city, r.trackId, r.registrationStatus, r.paymentStatus, r.paymentReference, r.submittedAt, r.verifiedAt ?? "", r.confirmationEmailStatus, r.rejectionReason].map(v => v ?? "");
}

export async function registrationBlob(event: string, teams: Registration[], format: "csv" | "xlsx" | "pdf"): Promise<Blob> {
  if (format === "pdf") {
    const [{ default: pdf }, { default: fonts }] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
    const content = teams.flatMap((r, index) => [
      { text: r.teamName + " · " + (r.teamCode || r.id), bold: true, fontSize: 16, pageBreak: index ? "before" as const : undefined },
      ...teamFields(r).slice(2).map((value, i) => ({ text: columns[i + 2] + ": " + (value || "—") })),
      { text: "Roster", bold: true, margin: [0, 12, 0, 4] as [number, number, number, number] },
      ...r.members.map(m => ({ text: [m.name, m.isLead ? "Leader" : "Member", m.email, m.phone, m.branchYear].filter(Boolean).join(" · ") })),
    ]);
    return new Promise(resolve => pdf.createPdf({ info: { title: event + " registrations" }, content }, undefined, undefined, fonts).getBlob(resolve));
  }

  const rows = [columns, ...teams.flatMap(r => {
    const members = r.members.length ? r.members : [null];
    return members.map(m => [...teamFields(r), m?.name ?? "", m ? (m.isLead ? "Leader" : "Member") : "", m?.email ?? "", m?.phone ?? "", m?.branchYear ?? ""]);
  })];
  if (format === "csv") {
    const quote = (value: string) => '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
    return new Blob(["\uFEFF", rows.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  }
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Registrations");
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach(col => { col.width = 26; });
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportRegistrations(event: string, teams: Registration[], format: "csv" | "xlsx" | "pdf") {
  const url = URL.createObjectURL(await registrationBlob(event, teams, format));
  const link = document.createElement("a");
  link.href = url;
  link.download = event + "-registrations." + format;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
