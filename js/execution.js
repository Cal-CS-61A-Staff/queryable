import {parse} from "./parser.js";
import {visualize} from "./visualize.js";
import {tableFormat} from "./utils.js";

const sql = window.SQL;

export function newDatabase() {
    return new sql.Database();
}

export function execute(command, db) {
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
