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
    return get_expression(new TokenBuffer(tokenized));
}

/**
 *
 * @param {TokenBuffer} buffer
 */
function get_expression(buffer) {
    const helpers = {
        "FROM": get_from,
        // "WHERE": get_where,
        // "GROUP": get_group,
        // "HAVING": get_having,
        // "ORDER": get_order,
        // "LIMIT": get_limit
    };
    if (buffer.empty) {
        throw "No tokens found";
    }
    let curr = buffer.pop_next().toUpperCase();
    if (curr === "SELECT") {
        let out = {};
        out["COLUMNS"] = get_columns(buffer);
        for (let specifier of Object.keys(helpers)) {
            let nextToken = buffer.pop_next();
            if (nextToken === ";") {
                return out;
            } else if (nextToken === specifier) {
                out[specifier] = helpers[specifier](buffer);
            }
        }
        assert(buffer.pop_next() === ";", "SELECT statement not terminated.");
        return out;
    } else {
        throw "Can only handle SELECT statements right now.";
    }
}

function get_from(buffer) {
    return build_iterator(build_aliased(get_table_name))(buffer);
}

function get_table_name(buffer) {
    // todo
    return buffer.pop_next();
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

function get_columns(buffer) {
    return build_iterator(build_aliased(get_col_expr))(buffer);
}

function get_col_expr(buffer) {
    let first = buffer.pop_next();
    if (buffer.get_next() === "(") {
        // aggregation
        buffer.pop_next();
        let expr = get_expr(buffer);
        assert(buffer.pop_next() === ")", "Aggregates should only take one expression.")
        return {type: "aggregate", operator: first, expr: expr};
    } else {
        return {type: "expr", expr: first};
    }
}

function get_expr(buffer) {
    // todo
    return buffer.pop_next();
}

/**
 *
 * @param {string} sqlString: the string to tokenize
 * @return {list} A list of tokens as strings
 */
function tokenize(sqlString) {
    const SPECIALS = ["=", "(", ")", "\"", "'", ".", ",", "-", "+", "*", "/", ";"];

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
                    return curr;
                }
            }
            curr += nextChar;
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