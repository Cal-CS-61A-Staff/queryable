import {assert} from "./utils.js";

class TokenBuffer {
    /**
     *
     * @param {list} tokens
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.i = 0;
    }

    get empty() {
        return this.i === this.tokens.length;
    }

    /**
     *
     * @return {string}
     */
    get_next() {
        return this.tokens[this.i];
    }

    /**
     *
     * @return {string}
     */
    pop_next() {
        let out = this.get_next();
        ++this.i;
        return out;
    }
}

export function parse(sqlString) {
    let tokenized = tokenize(sqlString);
    if (tokenized[tokenized.length - 1] !== ";") {
        tokenized.push(";");
    }
    return get_expression(new TokenBuffer(tokenized));
}

/**
 *
 * @param {TokenBuffer} buffer
 */
function get_expression(buffer) {
    const helpers = {
        "FROM": build_iterator(build_aliased(get_name)),
        "WHERE": get_expr,
        "GROUP": get_groups,
        "HAVING": get_expr,
        "ORDER": get_order,
        "LIMIT": get_limit
    };
    if (buffer.empty) {
        throw "No tokens found";
    }
    let curr = buffer.pop_next().toUpperCase();
    if (curr === "SELECT") {
        let out = {};
        out["COLUMNS"] = build_iterator(build_aliased(get_expr))(buffer);
        for (let specifier of Object.keys(helpers)) {
            let nextToken = buffer.get_next();
            if (nextToken === ";") {
                return out;
            } else if (nextToken.toUpperCase() === specifier) {
                buffer.pop_next();
                out[specifier] = helpers[specifier](buffer);
            }
        }
        assert(buffer.pop_next() === ";", "SELECT statement not terminated.");
        return out;
    } else if (curr === "CREATE") {
        assert(buffer.pop_next().toUpperCase() === "TABLE");
        let tableName = buffer.pop_next();
        assert(buffer.pop_next().toUpperCase() === "AS");
        return {TABLENAME: tableName, SELECT: get_expression(buffer)};
    }
    else {
        throw "Can only handle SELECT statements right now.";
    }
}

function get_groups(buffer) {
    assert(buffer.pop_next().toUpperCase() === "BY", "GROUP must be followed by BY");
    return build_iterator(get_expr)(buffer);
}

function get_name(buffer) {
    return buffer.pop_next();
}

function get_order(buffer) {
    assert(buffer.pop_next().toUpperCase() === "BY", "GROUP must be followed by BY");
    return build_iterator(get_expr)(buffer);
}

function get_limit(buffer) {
    return get_expr(buffer);
}

function build_aliased(callback) {
    return (buffer) => {
        let out = {"alias": []};
        out["expr"] = callback(buffer);
        if (buffer.get_next().toUpperCase() === "AS") {
            buffer.pop_next();
            out["alias"].push(buffer.pop_next());
        }
        return out;
    }
}

function build_iterator(callback) {
    return (buffer) => {
        let out = [];
        while (true) {
            out.push(callback(buffer));
            if (buffer.get_next() !== ",") {
                return out;
            }
            buffer.pop_next();
        }
    }
}

function get_expr(buffer) {
    let seq = [];
    const operators = ["OR", "AND", "!", "!=", "=", ">", ">=", "<", "<=", "+", "-", "*", "/"];
    while (true) {
        let val;
        if (buffer.get_next() === "(") {
            // grab parened
            buffer.pop_next();
            val = get_expr(buffer);
            assert(buffer.pop_next() === ")", "Parens not closed correctly");
        } else {
            // grab single
            let first = buffer.pop_next();
            if (first === "\"" || first === "\"") {
                val = {type: "string", val: buffer.pop_next()};
                assert(buffer.pop_next() === first, "Quotation marks must be matched.")
            } else if (buffer.get_next() === ".") {
                buffer.pop_next();
                let column = buffer.pop_next();
                val = {type: "dotaccess", table: first, column: column};
            } else if (buffer.get_next() === "(") {
                buffer.pop_next();
                let expr = get_expr(buffer);
                assert(buffer.pop_next() === ")", "Aggregates should only take one expression.")
                val = {type: "aggregate", operator: first, expr: expr};
            } else if (/^\d+$/.test(first)) {
                val = {type: "numeric", val: first};
            } else {
                val = {type: "column", column: first};
            }
        }
        seq.push(val);
        if (operators.includes(buffer.get_next().toUpperCase())) {
            let operator = buffer.pop_next().toUpperCase();
            if (operator === "!") {
                assert(buffer.pop_next() === "=", "Unknown operator: !");
                operator = "!=";
            } else if (operator === "<") {
                if (buffer.get_next() === ">") {
                    buffer.pop_next();
                    operator = "!=";
                } else if (buffer.get_next() === "=") {
                    buffer.pop_next();
                    operator = "<=";
                }
            } else if (operator === ">") {
                if (buffer.get_next() === "=") {
                    buffer.pop_next();
                    operator = ">=";
                }
            }
            seq.push(operator);
        } else {
            break;
        }
    }

    function hierarchize(seq) {
        if (seq.length === 1) {
            if (seq[0]["type"] !== "combination") {
                return {type: "atom", val: seq[0]};
            } else {
                return seq[0];
            }
        }
        for (let operator of operators) {
            let index = seq.findIndex((x) => (x === operator));
            if (index === -1) {
                continue;
            }
            return {
                type: "combination",
                operator: operator,
                left: hierarchize(seq.slice(0, index)),
                right: hierarchize(seq.slice(index + 1, seq.length))
            };
        }
        assert(false, "hierarchize failed");
    }

    return hierarchize(seq);
}

/**
 * @param {string} sqlString: the string to tokenize
 * @return {list} A list of tokens as strings
 */
function tokenize(sqlString) {
    const SPECIALS = ["=", "(", ")", "\"", "'", ".", ",", "-", "+", "*", "/", ";", "<", ">", "!"];

    let i = 0;
    let out = [];

    // should be called with i pointing at a non-space char
    function getToken() {
        let curr = "";
        while (i !== sqlString.length) {
            let nextChar = sqlString[i];
            ++i;
            if (nextChar.trim() === "") {
                return curr;
            } else if (SPECIALS.includes(nextChar)) {
                if (curr) {
                    --i;
                    return curr;
                } else {
                    curr = nextChar;
                    if (nextChar === "\"") {
                        out.push(curr);
                        out.push(getString(curr));
                        ++i;
                    }
                    return curr;
                }
            }
            curr += nextChar;
        }
        return curr;
    }

    function getString(close) {
        let curr = "";
        while (i !== sqlString.length && sqlString[i] !== close) {
            curr += sqlString[i];
            ++i;
        }
        return curr;
    }

    while (i !== sqlString.length) {
        if (sqlString[i].trim() === "") {
            ++i;
            continue;
        }
        out.push(getToken());
    }

    return out;
}