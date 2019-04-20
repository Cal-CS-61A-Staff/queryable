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
        // dotcommand
        if (command === ".quit" || command === ".exit") {
            window.close(); // sometimes works, depending on browser
            location.reload(); // otherwise this is the best we've got
        } else if (command === ".help") {
            return [
                ".exit                  Exit this program\n" +
                ".help                  Show this message\n" +
                ".quit                  Exit this program\n" +
                ".open                  Close existing database and reopen file to be selected\n" +
                ".read                  Execute SQL in file to be selected\n" +
                ".tables                List names of tables\n" +
                ".schema                Show all CREATE statements matching PATTERN"
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

    if (visualization) {
        visualization.push(tableFormat(dbRet[0]));

        let visualizeButton = document.createElement("BUTTON");
        visualizeButton.innerHTML = "Visualize";
        out.push(visualizeButton);

        let visualizePane = $.parseHTML("<div class='visualize-pane'' </div>");
        let innerVisualizePane = document.createElement("DIV");

        let prevButton = document.createElement("BUTTON");
        prevButton.innerHTML = "prev";

        let nextButton = document.createElement("BUTTON");
        nextButton.innerHTML = "next";

        $(visualizePane).append(prevButton).append(nextButton).append(innerVisualizePane);
        $(nextButton).hide();
        $(prevButton).hide();

        out.push(visualizePane);

        let i = 0;
        $(visualizeButton).click(() => {
            innerVisualizePane.innerHTML = visualization[0];
            $(visualizeButton).hide();
            $(nextButton).show();
            $(prevButton).show();
            $(prevButton).click(() => {
                i = Math.max(i - 1, 0);
                innerVisualizePane.innerHTML = visualization[i];
            });
            $(nextButton).click(() => {
                i = Math.min(i + 1, visualization.length - 1);
                innerVisualizePane.innerHTML = visualization[i];
            });
        })
    }

    for (let table of dbRet) {
        out.push(tableFormat(table));
    }

    return out;
}
