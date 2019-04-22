import {parse} from "./parser.js";
import {visualize} from "./visualize.js";
import {tableFormat} from "./utils.js";
import {preexisting} from "./default_tables.js";

const sql = window.SQL;

let db = newDatabase();

function newDatabase() {
    let db = new sql.Database();
    try {
        db.exec(preexisting);
    } catch (err) {
        // pass
    }
    return db;
}

export async function execute(command) {
    if (command.startsWith(".")) {
        if (command.split(" ").length > 1) {
            return [command.split(" ")[0] + " takes no arguments, on the web interpreter."];
        }
        // dotcommand
        if (command === ".quit" || command === ".exit") {
            window.close(); // sometimes works, depending on browser
            location.reload(); // otherwise this is the best we've got
            return [];
        } else if (command === ".help") {
            return [
                ".exit                  Exit this program\n" +
                ".help                  Show this message\n" +
                ".quit                  Exit this program\n" +
                ".open                  Close existing database and reopen file to be selected\n" +
                ".read                  Execute SQL in file to be selected\n" +
                ".tables                List names of tables\n" +
                ".schema                Show all CREATE statements"
            ];
        } else if (command === ".open") {
            db = newDatabase();
            return await execute(".read");
        } else if (command === ".read") {
            return new Promise((resolve, reject) => {
                $('<input type="file" />').click().on("change", (e) => {
                    let file = e.target.files[0];
                    let reader = new FileReader();
                    reader.readAsText(file);
                    reader.onload = () => {
                        resolve([reader.result, execute(reader.result, db)]);
                    };
                });
            });
        } else if (command === ".tables") {
            let dbRet = db.exec("SELECT name as Tables FROM sqlite_master WHERE type = 'table';");
            return [tableFormat(dbRet[0])];
        } else if (command === ".schema") {
            let dbRet = db.exec("SELECT (sql || ';') as `CREATE Statements` FROM sqlite_master WHERE type = 'table';");
            return [tableFormat(dbRet[0])];
        } else {
            return ["The command " + command.split(" ")[0] + " does not exist."];
        }
    }
    let visualization;
    try {
        let parsed = parse(command);
        visualization = visualize(parsed, db);
    } catch (err) {
        console.log(err);
    }
    let dbRet;
    try {
        dbRet = db.exec(command);
    } catch (err) {
        return [`<span style="color: red">Error: ${err.message}</span>`];
    }

    let out = [];

    for (let table of dbRet) {
        out.push(tableFormat(table));
    }

    if (visualization) {
        visualization.push(tableFormat(dbRet[0]));

        let visualizeButton = document.createElement("BUTTON");
        $(visualizeButton).addClass("btn btn-info btn-sm");
        visualizeButton.innerHTML = "Visualize";
        out.push(visualizeButton);

        let visualizePane = document.createElement("DIV");
        $(visualizePane).addClass('card');
        let visualizePaneHeader = document.createElement("DIV");
        $(visualizePaneHeader).addClass('card-header');
        let innerVisualizePane = document.createElement("DIV");
        $(innerVisualizePane).addClass('card-body');

        let firstButton = document.createElement("BUTTON");
        firstButton.innerHTML = "&lt;&lt;";
        $(firstButton).addClass("btn btn-secondary");

        let prevButton = document.createElement("BUTTON");
        prevButton.innerHTML = "&lt;";
        $(prevButton).addClass("btn btn-secondary");

        let nextButton = document.createElement("BUTTON");
        nextButton.innerHTML = "&gt;";
        $(nextButton).addClass("btn btn-secondary");

        let lastButton = document.createElement("BUTTON");
        lastButton.innerHTML = "&gt;&gt;";
        $(lastButton).addClass("btn btn-secondary");

        let buttons = document.createElement("DIV");
        $(buttons).addClass("btn-group visButtons");
        $(buttons).append(firstButton).append(prevButton).append(nextButton).append(lastButton);

        let closeVisualizeButton = document.createElement("BUTTON");
        closeVisualizeButton.innerHTML = "Hide Visualization";
        $(closeVisualizeButton).addClass("btn btn-info btn-sm");

        $(visualizePaneHeader).append(buttons).append(closeVisualizeButton);
        $(visualizePane).append(visualizePaneHeader);

        let tableRenderArea = document.createElement("DIV");
        $(innerVisualizePane).append(tableRenderArea);

        $(visualizePane).append(innerVisualizePane);
        $(visualizePane).hide();

        out.push(visualizePane);

        let i = 0;
        $(visualizeButton).click(() => {
            tableRenderArea.innerHTML = visualization[0];
            $(visualizeButton).hide();
            $(nextButton).show();
            $(prevButton).show();
            $(visualizePane).show();
        });
        $(firstButton).click(() => {
            i = 0;
            tableRenderArea.innerHTML = visualization[i];
        });
        $(prevButton).click(() => {
            i = Math.max(i - 1, 0);
            tableRenderArea.innerHTML = visualization[i];
        });
        $(nextButton).click(() => {
            i = Math.min(i + 1, visualization.length - 1);
            tableRenderArea.innerHTML = visualization[i];
        });
        $(lastButton).click(() => {
            i = visualization.length - 1;
            tableRenderArea.innerHTML = visualization[i];
        });
        $(closeVisualizeButton).click(() => {
            $(visualizePane).hide();
            $(visualizeButton).show();
            i = 0;
            tableRenderArea.innerHTML = visualization[i];
        });
    }

    return out;
}
