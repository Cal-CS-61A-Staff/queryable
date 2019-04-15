export function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

export function tableFormat(raw, group_size, num_groups) {
    if (!group_size) {
        group_size = raw["values"].length;
        num_groups = 1;
    }
    let colors = generateHslaColors(20, 80, 1.0, num_groups);
    let out = ["<table class='out-table'><thead><tr>"];
    for (let col of raw["columns"]) {
        out.push(`<th> ${col} </th>`);
    }
    out.push("</tr></thead>");
    for (let i = 0; i !== raw["values"].length; ++i) {
        let color = colors[Math.floor(i / group_size) % num_groups];
        out.push(`<tr style="background-color: ${color};">`);
        for (let val of raw["values"][i]) {
            out.push(`<td> ${val} </td>`);
        }
        out.push("</tr>");
    }
    out.push("</table>");
    return out.join("");
}

export function placeHorizontally(tables) {
    let out = ["<div>"];
    for (let table of tables) {
        out.push("<div style=\"display: inline-block;\">");
        out.push(table);
        out.push("</div> ");
    }
    out.push("</div>");
    return out.join("");
}


// @source https://mika-s.github.io/javascript/colors/hsl/2017/12/05/generating-random-colors-in-javascript.html
function generateHslaColors (saturation, lightness, alpha, amount) {
    let colors = [];
    let huedelta = Math.trunc(360 / amount);

    for (let i = 0; i < amount; i++) {
        let hue = i * huedelta;
        colors.push(`hsla(${hue},${saturation}%,${lightness}%,${alpha})`)
    }

    return colors
}