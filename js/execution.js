const sql = window.SQL;

export function newDatabase() {
    return new sql.Database();
}

export function execute(command, db) {
    let out;
    try {
        out = db.exec(command);
    } catch (err) {
        return `<span style="color: red">Error: ${err.message}</span>`
    }
    return outFormat(out);
}

function outFormat(raw) {
    let out = [];
    for (let table of raw) {
        out.push(tableFormat(table))
    }
    return out.join();
}

function tableFormat(raw) {
    let out = ["<table class='out-table'><thead><tr>"];
    for (let col of raw["columns"]) {
        out.push(`<th> ${col} </th>`);
    }
    out.push("</tr></thead>");
    for (let row of raw["values"]) {
        out.push("<tr>");
        for (let val of row) {
            out.push(`<td> ${val} </td>`);
        }
        out.push("</tr>");
    }
    out.push("</table>");
    return out.join("");
}