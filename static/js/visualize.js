/**
 * Should return a sequence of DOM objects that can be loaded into the visualizer
 * @param parsedSQL
 * @param db - Handle for active sql.js database
 */
import {assert, placeHorizontally, tableFormat, generateHslaColors} from "./utils.js";

export function visualize(parsedSQL, db) {
    let tables = new Map();
    for (let table of parsedSQL["FROM"]) {
        let tableName = table["expr"];
        tables.set(tableName, db.exec(`SELECT * FROM ${tableName};`)[0]) // what's sql injection anyway
    }
    let out = [];
    let workingTable = join(parsedSQL["FROM"], tables, out);
    if (parsedSQL["WHERE"]) {
        workingTable = where(workingTable, parsedSQL["WHERE"], parsedSQL["COLUMNS"], out);
    }
    console.log(parsedSQL);
    let groups;
    if (parsedSQL["GROUP"]) {
        groups = group(workingTable, parsedSQL["GROUP"], parsedSQL["COLUMNS"], out);
    } else {
        groups = [workingTable];
    }

    if (parsedSQL["HAVING"]) {
        groups = having(groups, parsedSQL["HAVING"], parsedSQL["COLUMNS"], out);
    }

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

    let colorCallback;
    if (tableNames.length > 1) {
        colorCallback = alternatingColorCallback(1, table["values"].length)
    } else {
        colorCallback = (i) => "white";
    }

    let tableDivs = [];
    for (let table of tables) {
        tableDivs.push(tableFormat(table, colorCallback));
    }
    out.push(placeHorizontally(tableDivs)); // just getting the tables

    if (tableNames.length > 1) {
        // need to visualize a join
        let finalSize = 1;
        for (let table of tables) {
            finalSize *= table["values"].length;
        }

        let duplicatedTables = [];
        let duplicatedTableDivs = [];
        let duplicates = finalSize;
        for (let table of tables) {
            duplicates /= table["values"].length;
            let repeats = finalSize / duplicates / table["values"].length;
            let duplicatedTable = {columns: table["columns"], "values": copyRows(table["values"], duplicates, repeats)};
            duplicatedTables.push(duplicatedTable);
            duplicatedTableDivs.push(tableFormat(duplicatedTable, alternatingColorCallback(duplicates, table["values"].length)));
        }

        out.push(placeHorizontally(duplicatedTableDivs)); // expanding to visualize the join

        let joinedCols = [];
        for (let table of duplicatedTables) {
            joinedCols.push(...table["columns"]);
        }
        let joinedVals = [];
        for (let i = 0; i !== finalSize; ++i) {
            let currRow = [];
            for (let table of duplicatedTables) {
                currRow.push(...table["values"][i]);
            }
            joinedVals.push(currRow);
        }

        let joinedTable = {columns: joinedCols, values: joinedVals};

        out.push(tableFormat(joinedTable));

        return joinedTable;
    } else {
        return tables[0];
    }
}

function alternatingColorCallback(group_size, num_groups) {
    let colors = generateHslaColors(20, 80, 1.0, num_groups);
    return (i) => colors[Math.floor(i / group_size) % num_groups];
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

function where(table, whereClause, selectClause, out) {
    let selectedRows = [];
    for (let i = 0; i !== table["values"].length; ++i) {
        if (evaluate(whereClause, table["columns"], table["values"][i], selectClause)) {
            selectedRows.push(i);
        }
    }
    let highlightRows = ((i) => (selectedRows.includes(i) ? "lightgreen" : "white"));
    out.push(tableFormat(table, highlightRows));

    let rows = [];
    for (let row of table["values"]) {
        if (evaluate(whereClause, table["columns"], row, selectClause)) {
            rows.push(row);
        }
    }

    let filteredTable = {columns: table["columns"], values: rows};
    out.push(tableFormat(filteredTable));
    return filteredTable;
}

function group(table, groupColumns, selectClause, out) {
    let groups = new Map();
    let groupLookup = [];
    const SPACING = "-------";
    console.log("grouping");
    for (let i = 0; i !== table["values"].length; ++i) {
        let groupKey = "";
        for (let column of groupColumns) {
            groupKey += evaluate(column, table["columns"], table["values"][i], selectClause);
            groupKey += SPACING;
        }
        if (!groups.has(groupKey)) {
            groups.set(groupKey, groups.size);
        }
        groupLookup.push(groups.get(groupKey));
    }

    let colors = generateHslaColors(20, 80, 1.0, groups.size);

    let colorGrouper = (i) => colors[groupLookup[i]];
    out.push(tableFormat(table, colorGrouper));

    let groupedTables = [];
    for (let i = 0; i !== groups.size; ++i) {
        groupedTables.push({columns: table["columns"], values: []});
    }

    for (let i = 0; i !== groupLookup.length; ++i) {
        groupedTables[groupLookup[i]]["values"].push(table["values"][i]);
    }

    let groupedTableDivs = [];
    for (let i = 0; i !== groups.size; ++i) {
        groupedTableDivs.push(tableFormat(groupedTables[i], (j) => colors[i]))
    }

    out.push(placeHorizontally(groupedTableDivs));

    return groupedTables;
}

function having(groups, havingClause, selectClause, out) {
    let selectedGroups = Set();
    for (let i = 0; i !== groups.length; ++i) {
        if (evaluate(havingClause, table["columns"], groups[i]["values"][groups[i]["values"].length - 1],
                     selectClause, groups[i]["values"])) {
            selectedGroups.put(i);
        }
    }
    let highlightedGroupDivs = [];
    for (let i = 0; i !== groups.length; ++i) {
        let colorCallback;
        if (selectedGroups.has(i)) {
            colorCallback = (i) => "lightgreen";
        } else {
            colorCallback = (i) => "white";
        }
        highlightedGroupDivs.push(tableFormat(groups[i], colorCallback));
    }

    out.push(placeHorizontally(highlightedGroupDivs));

    let selectedGroupTables = [];
    for (let group of selectedGroups) {
        selectedGroupTables.push(groups[group]);
    }

    return selectedGroupTables;
}

function evaluateName(expr, columnNames, rowValues, selectClause) {
    let targetName;
    if (expr["type"] === "column") {
        targetName = expr["column"];
    } else if (expr["type"] === "dotaccess") {
        targetName = expr["table"] + "." + expr["column"];
    } else {
        assert(false, "Unknown atomic expr type: " + expr["type"]);
    }
    for (let i = 0; i !== columnNames.length; ++i) {
        if (columnNames[i] === targetName || columnNames[i].split(".")[1] === targetName) {
            return rowValues[i];
        }
    }
    for (let clause of selectClause) {
        if (clause["alias"] && clause["alias"][0] === targetName) {
            return evaluate(clause["expr"], columnNames, rowValues, selectClause, out)
        }
    }
    assert(false, "Unable to evaluate column name: " + targetName);
}

function evaluate(whereClause, columnNames, rowValues, selectClause, allRows) {
    if (whereClause["type"] === "atom") {
        let expr = whereClause["val"];
        if (expr["type"] === "aggregate") {
            assert(allRows !== undefined, "aggregates can't be used in the WHERE clause");
            let func = expr["operator"];
            let expr = expr["expr"];
            let vals = [];
            for (let row of allRows) {
                vals.push(evaluate(expr, columnNames, row, selectClause, allRows));
            }
            if (func === "max") {
                return Math.max(vals);
            } else if (func === "min") {
                return Math.min(vals);
            } else if (func === "count") {
                return vals.length;
            } else if (func === "sum") {
                return vals.reduce((a, b) => (a + b));
            }
        } else if (expr["type"] === "numeric") {
            return parseFloat(expr["val"]);
        } else if (expr["type"] === "string") {
            return expr["val"];
        } else {
            return evaluateName(expr, columnNames, rowValues, selectClause);
        }
    } else if (whereClause["type"] === "combination") {
        let left = evaluate(whereClause["left"], columnNames, rowValues, selectClause);
        let right = evaluate(whereClause["right"], columnNames, rowValues, selectClause);
        switch (whereClause["operator"]) {
            case "OR":
                return left || right;
            case "AND":
                return left && right;
            case "!=":
                return left !== right;
            case "=":
                return left === right;
            case ">":
                return left > right;
            case ">=":
                return left >= right;
            case "<":
                return left < right;
            case "<=":
                return left <= right;
            case "+":
                return left + right;
            case "-":
                return left - right;
            case "/":
                return left / right;
            case "*":
                return left * right;
            default:
                assert(false, "Unknown operator: " + whereClause["operator"]);
        }
    } else{
        assert(false, "Unknown clause type: " + whereClause["type"]);
    }
}
