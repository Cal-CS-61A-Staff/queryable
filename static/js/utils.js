export function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

export function tableFormat(raw, colorCallback) {
    if (!colorCallback) {
        colorCallback = (i) => "white";
    }
    let out = ["<table class='out-table'><thead><tr>"];
    for (let col of raw["columns"]) {
        out.push(`<th> ${col} </th>`);
    }
    out.push("</tr></thead>");
    for (let i = 0; i !== raw["values"].length; ++i) {
        out.push(`<tr style="background-color: ${colorCallback(i)};">`);
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
export function generateHslaColors (saturation, lightness, alpha, amount) {
    let colors = [];
    let huedelta = Math.trunc(360 / amount);

    for (let i = 0; i < amount; i++) {
        let hue = i * huedelta;
        colors.push(`hsla(${hue},${saturation}%,${lightness}%,${alpha})`)
    }

    return colors
}