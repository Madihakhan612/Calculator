"use strict";

// =====================================
// SCIENTIFIC CALCULATOR
// =====================================

const resultDisplay = document.getElementById("result");
const historyDisplay = document.getElementById("history");
const clockDisplay = document.getElementById("clock");
const settingsPanel = document.getElementById("settings-panel");

const angleButtons = document.querySelectorAll(".angle-btn");
const modeButtons = document.querySelectorAll(".mode-btn");
const scientificKeys = document.querySelector(".scientific-keys");
const numberKeys = document.querySelector(".number-keys");

let expression = "";
let angleMode = "DEG";
let calculatorMode = "scientific";
let justCalculated = false;
let lastAnswer = 0;

// =====================================
// DISPLAY
// =====================================

function updateDisplay() {
    resultDisplay.textContent = expression || "0";
}

function formatNumber(number) {
    if (!Number.isFinite(number)) {
        throw new Error("Math Error");
    }

    if (Math.abs(number) < 1e-12) number = 0;

    return Number(number.toPrecision(12)).toString();
}

function clearCalculator() {
    expression = "";
    historyDisplay.textContent = "";
    justCalculated = false;
    updateDisplay();
}

function toggleSettings() {
    settingsPanel.classList.toggle("hidden");
}

window.toggleSettings = toggleSettings;

// =====================================
// CLOCK
// =====================================

function updateClock() {
    clockDisplay.textContent = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

updateClock();
setInterval(updateClock, 1000);

// =====================================
// ANGLE MODE: DEG / RAD / GRAD
// =====================================

angleButtons.forEach(button => {
    button.addEventListener("click", () => {
        angleMode = button.dataset.angle;

        angleButtons.forEach(btn => {
            btn.classList.toggle("active", btn === button);
        });
    });
});

function toRadians(number) {
    if (angleMode === "DEG") return number * Math.PI / 180;
    if (angleMode === "GRAD") return number * Math.PI / 200;
    return number;
}

function fromRadians(number) {
    if (angleMode === "DEG") return number * 180 / Math.PI;
    if (angleMode === "GRAD") return number * 200 / Math.PI;
    return number;
}

// =====================================
// STANDARD / SCIENTIFIC MODE
// =====================================

modeButtons.forEach(button => {
    button.addEventListener("click", () => {
        calculatorMode = button.dataset.mode;

        modeButtons.forEach(btn => {
            btn.classList.toggle("active", btn === button);
        });

        scientificKeys.style.display =
            calculatorMode === "scientific" ? "grid" : "none";
    });
});

// =====================================
// INPUT
// =====================================

function appendValue(value) {
    if (justCalculated) {
        if (/[0-9.(]/.test(value)) {
            expression = "";
        }
        justCalculated = false;
    }

    if (
        value === "(" &&
        /[0-9.)]$/.test(expression)
    ) {
        expression += "*";
    }

    if (
        /^[0-9.]$/.test(value) &&
        expression.endsWith(")")
    ) {
        expression += "*";
    }

    expression += value;
    updateDisplay();
}

function appendOperator(operator) {
    justCalculated = false;

    if (!expression) {
        if (operator === "-") expression = "-";
        updateDisplay();
        return;
    }

    if (/[+\-*/^]$/.test(expression)) {
        expression = expression.slice(0, -1);
    }

    expression += operator;
    updateDisplay();
}

function appendConstant(value) {
    if (justCalculated) {
        expression = "";
        justCalculated = false;
    }

    if (/[0-9.)]$/.test(expression)) {
        expression += "*";
    }

    expression += value === "pi" ? "pi" : "e";
    updateDisplay();
}

function appendFunction(name) {
    if (justCalculated) {
        expression = "";
        justCalculated = false;
    }

    if (name === "square" || name === "cube") {
        if (!expression) return;

        expression = "(" + expression + ")" +
            (name === "square" ? "^2" : "^3");

        updateDisplay();
        return;
    }

    if (/[0-9.)]$/.test(expression)) {
        expression += "*";
    }

    expression += name + "(";
    updateDisplay();
}

function addDecimal() {
    if (justCalculated) {
        expression = "";
        justCalculated = false;
    }

    const current = expression.split(/[+\-*/^()%()]/).pop();

    if (current.includes(".")) return;

    if (!expression || /[+\-*/^(]$/.test(expression)) {
        expression += "0.";
    } else {
        expression += ".";
    }

    updateDisplay();
}

function deleteLast() {
    if (justCalculated) {
        clearCalculator();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}

function toggleSign() {
    if (!expression) {
        expression = "-";
    } else if (
        expression.startsWith("-(") &&
        expression.endsWith(")")
    ) {
        expression = expression.slice(2, -1);
    } else {
        expression = "-(" + expression + ")";
    }

    justCalculated = false;
    updateDisplay();
}

// =====================================
// MATHEMATICAL PARSER
// No eval() used
// =====================================

function calculateExpression(input) {
    input = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi")
        .replace(/√\(/g, "sqrt(")
        .replace(/\s+/g, "");

    // Implicit multiplication: 2pi, 2(3), (2)(3)
    input = input.replace(
        /(\d|\)|pi|e)(?=(pi|e|sin|cos|tan|log|ln|sqrt|cbrt|\())/g,
        "$1*"
    );

    const tokens = input.match(
        /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-zA-Z]+|[()+\-*/^%]/gi
    );

    if (!tokens || tokens.join("") !== input) {
        throw new Error("Invalid Input");
    }

    let index = 0;

    function peek() {
        return tokens[index];
    }

    function eat(value) {
        if (tokens[index] !== value) {
            throw new Error("Invalid Expression");
        }
        index++;
    }

    function primary() {
        const token = peek();

        if (token === undefined) {
            throw new Error("Incomplete Expression");
        }

        if (token === "(") {
            index++;
            const value = addSub();
            eat(")");
            return value;
        }

        if (token === "+") {
            index++;
            return unary();
        }

        if (token === "-") {
            index++;
            return -unary();
        }

        if (/^(?:\d|\.)/.test(token)) {
            index++;
            return Number(token);
        }

        if (/^[a-z]+$/i.test(token)) {
            index++;
            const name = token.toLowerCase();

            if (name === "pi") return Math.PI;
            if (name === "e") return Math.E;
            if (name === "ans") return lastAnswer;

            eat("(");
            const value = addSub();
            eat(")");

            switch (name) {
                case "sin":
                    return Math.sin(toRadians(value));

                case "cos":
                    return Math.cos(toRadians(value));

                case "tan":
                    if (
                        Math.abs(Math.cos(toRadians(value))) < 1e-12
                    ) {
                        throw new Error("Undefined");
                    }
                    return Math.tan(toRadians(value));

                case "log":
                    if (value <= 0) throw new Error("Math Error");
                    return Math.log10(value);

                case "ln":
                    if (value <= 0) throw new Error("Math Error");
                    return Math.log(value);

                case "sqrt":
                    if (value < 0) throw new Error("Math Error");
                    return Math.sqrt(value);

                case "cbrt":
                    return Math.cbrt(value);

                case "asin":
                    return fromRadians(Math.asin(value));

                case "acos":
                    return fromRadians(Math.acos(value));

                case "atan":
                    return fromRadians(Math.atan(value));

                case "abs":
                    return Math.abs(value);

                default:
                    throw new Error("Unknown Function");
            }
        }

        throw new Error("Invalid Expression");
    }

    function unary() {
        return primary();
    }

    function power() {
        const base = primary();

        if (peek() === "^") {
            index++;
            return Math.pow(base, unaryPower());
        }

        return base;
    }

    function unaryPower() {
        if (peek() === "-") {
            index++;
            return -unaryPower();
        }

        if (peek() === "+") {
            index++;
            return unaryPower();
        }

        return power();
    }

    function postfix() {
        let value = unary();

        while (peek() === "%") {
            index++;
            value /= 100;
        }

        return value;
    }

    function factor() {
        let value;

        if (peek() === "+" || peek() === "-") {
            const sign = tokens[index++];
            value = factor();

            if (sign === "-") value = -value;
        } else {
            value = primary();

            if (peek() === "^") {
                index++;
                value = Math.pow(value, factor());
            }
        }

        while (peek() === "%") {
            index++;
            value /= 100;
        }

        return value;
    }

    function multiplyDivide() {
        let value = factor();

        while (peek() === "*" || peek() === "/") {
            const operator = tokens[index++];
            const next = factor();

            if (operator === "/" && next === 0) {
                throw new Error("Cannot Divide by Zero");
            }

            value = operator === "*" ? value * next : value / next;
        }

        return value;
    }

    function addSub() {
        let value = multiplyDivide();

        while (peek() === "+" || peek() === "-") {
            const operator = tokens[index++];
            const next = multiplyDivide();

            value = operator === "+" ? value + next : value - next;
        }

        return value;
    }

    const answer = addSub();

    if (index !== tokens.length) {
        throw new Error("Invalid Expression");
    }

    if (!Number.isFinite(answer)) {
        throw new Error("Math Error");
    }

    return answer;
}

// =====================================
// EQUALS
// =====================================

function calculateResult() {
    if (!expression) return;

    try {
        const oldExpression = expression;
        const answer = calculateExpression(expression);

        historyDisplay.textContent = oldExpression + " =";
        expression = formatNumber(answer);
        lastAnswer = answer;
        justCalculated = true;

        updateDisplay();
    } catch (error) {
        showError(error.message || "Math Error");
    }
}

// =====================================
// BUTTON CLICK EVENTS
// Matches your HTML data-action values
// =====================================

document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
        const action = button.dataset.action;
        const value = button.dataset.value;

        switch (action) {
            case "input":
                appendValue(value);
                break;

            case "operator":
                appendOperator(value);
                break;

            case "constant":
                appendConstant(value);
                break;

            case "func":
                appendFunction(value);
                break;

            case "decimal":
                addDecimal();
                break;

            case "clear":
                clearCalculator();
                break;

            case "delete":
                deleteLast();
                break;

            case "sign":
                toggleSign();
                break;

            case "equals":
                calculateResult();
                break;
        }
    });
});

// =====================================
// KEYBOARD SUPPORT
// =====================================

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const key = event.key;

    if (/^[0-9]$/.test(key)) {
        appendValue(key);
    } else if (key === ".") {
        addDecimal();
    } else if (["+", "-", "*", "/", "^", "%"].includes(key)) {
        appendOperator(key);
    } else if (key === "(" || key === ")") {
        appendValue(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculateResult();
    } else if (key === "Backspace") {
        deleteLast();
    } else if (key === "Escape" || key === "Delete") {
        clearCalculator();
    }
});