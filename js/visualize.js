/**
 * Should return a sequence of DOM objects that can be loaded into the visualizer
 * @param parsedSQL
 * @param db - Handle for active sql.js database
 */
import {assert, placeHorizontally, tableFormat} from "./utils.js";

export function visualize(parsedSQL, db) {
    let tables = new Map();
    for (let table of parsedSQL["FROM"]) {
        let tableName = table["expr"];
        tables.set(tableName, db.exec(`SELECT * FROM ${tableName};`)[0]) // what's sql injection anyway
    }
    let out = [];
    let joinedTable = join(parsedSQL["FROM"], tables, out);
    return out;
}

/**
 *
 * @param {list} tableNames
 * @param {Map} tableData
 * @param out
 */
function join(tableNames, tableData, out) {
    let tables = [];
    for (let tableName of tableNames) {
        let cols = [];
        let realName = tableName["expr"];
        let displayName;
        if (tableName["alias"].length > 0) {
            displayName = tableName["alias"][0];
        } else {
            displayName = tableName["expr"];
        }
        for (let column of tableData.get(realName)["columns"]) {
            cols.push(displayName + "." + column);
        }
        let tableToJoin = {columns: cols, values: tableData.get(realName)["values"]};
        tables.push(tableToJoin);
    }
    let tableDivs = [];
    for (let table of tables) {
        tableDivs.push(tableFormat(table));
    }
    out.push(placeHorizontally(tableDivs)); // just getting the tables

    let finalSize = 1;
    for (let table of tables) {
        finalSize *= table["values"].length;
    }

    let duplicatedTableDivs = [];
    let duplicates = finalSize;
    for (let table of tables) {
        duplicates /= table["values"].length;
        let repeats = finalSize / duplicates / table["values"].length;
        let duplicatedTable = {columns: table["columns"], "values": copyRows(table["values"], duplicates, repeats)};
        duplicatedTableDivs.push(tableFormat(duplicatedTable, duplicates, table["values"].length));
    }

    out.push(placeHorizontally(duplicatedTableDivs)); // expanding to visualize the join

    return out[1];
}

function copyRows(rows, duplicates, repeats) {
    let out = [];
    for (let i = 0; i !== repeats; ++i) {
        for (let row of rows) {
            for (let j = 0; j !== duplicates; ++j) {
                out.push(row);
            }
        }
    }
    return out;
}