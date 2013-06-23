/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil; tab-width: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
 * Copyright 2013 Art Compiler LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (target) {

  jQuery.extend (target, {
    MathModel : Model.extend({
      format: format,
      eval: evalModel,
      toString: toString,
    }),
  });

  var OpStr = {
    ADD: "+",
    SUB: "-",
    MUL: "times",
    DIV: "div",
    FRAC: "frac",
    EQL: "=",
    ATAN2: "atan2",
    SQRT: "sqrt",
    PM: "pm",
    SIN: "sin",
    COS: "cos",
    TAN: "tan",
    SEC: "sec",
    COT: "cot",
    CSC: "csc",
    LN: "ln",
    VAR: "var",
    CST: "cst",
    COMMA: ",",
    POW: "^",
    ABS: "abs",
    PAREN: "()",
    HIGHLIGHT: "hi",
  };
    
  var OpToLaTeX = { }
  OpToLaTeX[OpStr.ADD] = "+";
  OpToLaTeX[OpStr.SUB] = "-";
  OpToLaTeX[OpStr.MUL] = "\\times";
  OpToLaTeX[OpStr.DIV] = "\\div";
  OpToLaTeX[OpStr.FRAC] = "\\frac";
  OpToLaTeX[OpStr.EQL] = "=";
  OpToLaTeX[OpStr.ATAN2] = "\\atan2";
  OpToLaTeX[OpStr.POW] = "^";
  OpToLaTeX[OpStr.PM] = "\\pm";
  OpToLaTeX[OpStr.SIN] = "\\sin";
  OpToLaTeX[OpStr.COS] = "\\cos";
  OpToLaTeX[OpStr.TAN] = "\\tan";
  OpToLaTeX[OpStr.SEC] = "\\sec";
  OpToLaTeX[OpStr.COT] = "\\cot";
  OpToLaTeX[OpStr.CSC] = "\\csc";
  OpToLaTeX[OpStr.LN] = "\\ln";
  OpToLaTeX[OpStr.COMMA] = ",";
  
  return;  // end initialization

  // private implementation

  function toString() {
    var n = this.node;
    return format(n);
  }

  function evalModel(env) {
    var n = this.node;
    return eval(n, env);
  }

  function graph(n, color, range) {
    var graph = currentGraph;
    
    function g(x) {
      // set up the lexical environment for evaluating ast n
      var env = {x: x};
      var val = eval(n, env);
      return val;
    }
    
    if (!range) {
      range = 10;
    }
    
    
    if (graph.last) {
      jQuery(graph).remove();
      graph.last.remove();
      
      graph.style({
        stroke: color,
        strokeWidth: 3,
        fill: "none",
        clipRect:[ [-range, -range], [2*range, 2*range] ],
        arrows: null
      });
      
      graph.last = graph.plot( g, [-10, 10] );
    }
    else {
      graph.graphInit({
        range: range+1,
        scale: 20,
        axisArrows: "&lt;-&gt;",
        tickStep: 1,
        labelStep: 1
      });
      graph.style({
        stroke: color,
        strokeWidth: 3,
        fill: "none",
        clipRect:[ [-range, -range], [2*range, 2*range] ],
        arrows: null
      });
      
      graph.plot( g, [-range, range] );
      graph.last = graph.plot( g, [-range, range] );
    }
    
  }

  function isValidAST(n) {
    return n.kind() !== void 0;
  }
  
  function isEqual(n1, n2) {
    var ast = currentAST;
    
    var nid1 = ast.intern(n1);
    var nid2 = ast.intern(n2);
    
    if (nid1===nid2) {
      return true;
    }
    
    if (n1.op===n2.op && n1.args.length===n2.args.length) {
      if (n1.args.length===2) {
        var n1arg0 = ast.intern(n1.args[0]);
        var n1arg1 = ast.intern(n1.args[1]);
        var n2arg0 = ast.intern(n2.args[0]);
        var n2arg1 = ast.intern(n2.args[1]);
        if (n1arg0===n2arg1 && n1arg1===n2arg0) {
          return true;
        }
      }
    }
    return false;
  }

  function polynomial(coeffs, ident, lhs) {
    // construct a polynomial expression
    // build left recursive ast
    
    if (coeffs.length === 0) {
      // we're done
      return lhs;
    }
    
    if (ident === void 0) {
      // default identifier
      ident = "x";
    }
    
    if (coeffs.length === 1) {
      // degree zero
      var rhs = coeffs[0]
    }
    else {
      // construct a term of degree given by the size of coeffs
      var rhs = {op: "times", args: [coeffs[0], {op: "^", args: [{op: "var", args: [ident]}, coeffs.length-1]}]};
    }
    
    if (coeffs[0] === 0) {
      // zero coefficient, erase term by not updating lhs
    }
    else if (lhs === void 0) {
      // first term, no lhs to contribute, so rhs is lhs
      var lhs = rhs;
    }
    else {
      // normal case
      if (lhs.op===rhs.op && jQuery.type(lhs.args)==="array") {
        lhs.args.push(rhs);
      }
      else {
        lhs = {op: "+", args: [lhs, rhs]}
      }
    }
    
    // recurse until no more coefficients
    return polynomial(coeffs.slice(1), ident, lhs);
  }

  target.format = format;

  // format an AST
  function format(n, color, textSize) {
    
    if (textSize===void 0) {
      textSize = "normalsize";
    }
    
    if (color===void 0) {
      color = "#000";  // black is the default
    }
    
    var text;
    
    if (jQuery.type(n)==="string") {
      n = parse(n);
    }
    
    if (jQuery.type(n)==="number") {
      text = "\\color{"+color+"}{"+n+"}";
    }
    else if (jQuery.type(n)==="object") {

      // format sub-expressions
      var args = [];
      for (var i = 0; i < n.args.length; i++) {
        args[i] = format(n.args[i], color, textSize);
      }
      
      // format operator
      switch (n.op) {
      case OpStr.VAR:
      case OpStr.CST:
        text = "\\color{"+color+"}{"+n.args[0]+"}";
        break;
      case OpStr.SUB:
        if (n.args.length===1) {
          text = "\\color{#000}{"+ OpToLaTeX[n.op] + "} " + args[0];
        }
        else {
          text = args[0] + " \\color{#000}{" + OpToLaTeX[n.op] + "} " + args[1];
        }
        break;
      case OpStr.DIV:
      case OpStr.PM:
      case OpStr.EQL:
        text = args[0] + " \\color{#000}{" + OpToLaTeX[n.op] + "} " + args[1];
        break;
      case OpStr.POW:
        // if subexpr is lower precedence, wrap in parens
        var lhs = n.args[0];
        var rhs = n.args[1];
        if ((lhs.args && lhs.args.length===2) || (rhs.args && rhs.args.length===2)) {
          if (lhs.op===OpStr.ADD || lhs.op===OpStr.SUB ||
            lhs.op===OpStr.MUL || lhs.op===OpStr.DIV ||
            lhs.op===OpStr.SQRT) {
            args[0] = "\\color{#000}{(} " + args[0] + "\\color{#000}{)} ";
          }
        }
        text = "{" + args[0] + "^{" + args[1] + "}}";
        break;
      case OpStr.SIN:
      case OpStr.COS:
      case OpStr.TAN:
      case OpStr.SEC:
      case OpStr.COT:
      case OpStr.CSC:
      case OpStr.LN:
        text = "\\color{"+"#000"+"}{"+ OpToLaTeX[n.op] + "{" + args[0] + "}}";
        break;
      case OpStr.FRAC:
        text = "\\color{#000}{\\dfrac{" + args[0] + "}{" + args[1] + "}}";
        break;
      case OpStr.SQRT:
        switch (args.length) {
        case 1:
          text = "\\color{" + "#000" + "}{\\sqrt{" + args[0] + "}}";
          break;
        case 2:
          text = "\\color{" + "#000" + "}{\\sqrt[" + args[0] + "]{" + args[1] + "}}";
          break;
        }
        break;
      case OpStr.MUL:
        // if subexpr is lower precedence, wrap in parens
        var prevTerm;
        text = "";
        jQuery.each(n.args, function (index, term) {
          if (term.args && (term.args.length >= 2)) {
            if (term.op===OpStr.ADD || term.op===OpStr.SUB) {
              args[index] = "\\color{#000}{(} " + args[index] + "\\color{#000}{)}";
            }
            if (index !== 0 && jQuery.type(term)==="number") {
              text += "\\color{#000}{" + OpToLaTeX[n.op] + "} ";
            }
            text += args[index];
          }
          // elide the times symbol if rhs is parenthesized or a var, or lhs is a number
          // and rhs is not a number
          else if (term.op===OpStr.PAREN ||
               term.op===OpStr.VAR ||
               term.op===OpStr.CST ||
               jQuery.type(prevTerm)==="number" && jQuery.type(term)!=="number") {
            text += args[index];
          }
          else {
            if (index !== 0) {
              text += " \\color{#000}{" + OpToLaTeX[n.op] + "} ";
            }
            text += args[index];
          }
          prevTerm = term;
        });
        break;
      case OpStr.ADD:
      case OpStr.COMMA:
        jQuery.each(args, function (index, value) {
          if (index===0) {
            text = value;
          }
          else {
            text = text + " \\color{#000}{"+ OpToLaTeX[n.op] + "} " + value;
          }
        });
        break;
      default:
        assert(false, "unimplemented eval operator");
        break;
      }
    }
    else {
      assert(false, "invalid expression type");
    }
    
    return text;
  }

  function eval(n, env) {
    
    var val;
    
    if (jQuery.type(n)==="string" ||
      jQuery.type(n)==="number") {
      val = n;
    }
    else
      if (jQuery.type(n)==="object") {
        var args = [];
        for (var i = 0; i < n.args.length; i++) {
          args[i] = eval(n.args[i], env);
        }
        
        switch (n.op) {
        case OpStr.VAR:
        case OpStr.CST:
          assert(args.length===1, "wrong number of arguments to var or cst");
          val = env[args[0]];
          break;
        case OpStr.SUB:
          assert(args.length===2, "wrong number of arguments to subtract");
          switch (args.length) {
          case 1:
            val = -args[0];
            break;
          case 2:
            val = args[0] - args[1];
            break;
          }
          break;
        case OpStr.DIV:
        case OpStr.FRAC:
          assert(args.length===2, "wrong number of arguments to div/frac");
          val = args[0] / args[1];
          break;
        case OpStr.POW:
          assert(args.length===2, "wrong number of arguments to pow");
          val = Math.pow(args[0], args[1]);
          break;
        case OpStr.SIN:
          assert(args.length===1, "wrong number of arguments to sin");
          val = Math.sin(args[0]);
          break;
        case OpStr.COS:
          assert(args.length===1, "wrong number of arguments to cos");
          val = Math.cos(args[0]);
          break;
        case OpStr.TAN:
          assert(args.length===1, "wrong number of arguments to tan");
          val = Math.tan(args[0]);
          break;
        case OpStr.SQRT:
          assert(args.length < 3, "wrong number of arguments to sqrt");
          switch (args.length) {
          case 1:
            val = Math.sqrt(args[0]);
            break;
          case 2:
            val = Math.pow(args[0], 1/args[1]);
            break;
          }
          break;
        case OpStr.MUL:
          var val = 1;
          jQuery.each(args, function (index, value) {
            val *= value;
          });
          break;
        case OpStr.ADD:
          var val = 0;
          jQuery.each(args, function (index, value) {
            val += value;
          });
          break;
        case OpStr.SEC:
        case OpStr.COT:
        case OpStr.CSC:
        case OpStr.LN:
        case OpStr.PM:
        case OpStr.EQL:
        case OpStr.COMMA:
        default:
          assert(false, "unimplemented eval operator");
          break;
        }
      }
    else {
      assert(false, "invalid expression type");
    }
    
    return val;
  }
  
  function isNeg(n) {
    if (jQuery.type(n)==="number") {
      return n < 0;
    }
    else if (n.args.length===1) {
      return n.op===OpStr.SUB && n.args[0] > 0;  // is unary minus
    }
    else if (n.args.length===2) {
      return n.op===OpStr.MUL && isNeg(n.args[0]);  // leading term is neg
    }
  }
  
  function negate(n) {
    if (jQuery.type(n)==="number") {
      return -n;
    }
    else if (n.args.length===1 && n.op===OpStr.SUB) {
      return n.args[0];  // strip the unary minus
    }
    else if (n.args.length===2 && n.op===OpStr.MUL && isNeg(n.args[0])) {
      return {op: n.op, args: [negate(n.args[0]), n.args[1]]};
    }
    assert(false);
    return n;
    
  }

  function isZero(n) {
    if (jQuery.type(n)==="number") {
      return n === 0;
    }
    else {
      return n.args.length===1 &&  n.op===OpStr.SUB && n.args[0] === 0;  // is unary minus
    }
  }
})(this);

(function (target) {

  jQuery.extend (target, {
    MathModel : Model.extend({
      parse: parseModel,
    }),
  });

  // make parse and format static methods too.
  target.parse = parseModel;
  function parseModel(str) {
    // call the parser defined below
    return parse(str).expr();
  }

  function parse(src) {

    var TK_NONE = 0;
    var TK_ADD = '+'.charCodeAt(0);
    var TK_CARET = '^'.charCodeAt(0);
    var TK_COS = 0x105;
    var TK_COT = 0x108;
    var TK_CSC = 0x109;
    var TK_DIV = '/'.charCodeAt(0);
    var TK_EQL = '='.charCodeAt(0);
    var TK_FRAC = 0x100;
    var TK_LN = 0x107;
    var TK_LEFTBRACE = '{'.charCodeAt(0);
    var TK_LEFTBRACKET = '['.charCodeAt(0);
    var TK_LEFTPAREN = '('.charCodeAt(0);
    var TK_MUL = '*'.charCodeAt(0);
    var TK_NUM = '0'.charCodeAt(0);
    var TK_PM = 0x102;
    var TK_RIGHTBRACE = '}'.charCodeAt(0);
    var TK_RIGHTBRACKET = ']'.charCodeAt(0);
    var TK_RIGHTPAREN = ')'.charCodeAt(0);
    var TK_SEC = 0x106;
    var TK_SIN = 0x103;
    var TK_SQRT = 0x101;
    var TK_SUB = '-'.charCodeAt(0);
    var TK_TAN = 0x104;
    var TK_VAR = 'a'.charCodeAt(0);
    var TK_COEFF = 'A'.charCodeAt(0);
    var TK_VAR = 'a'.charCodeAt(0);
    var TK_NEXT = 0x10A;

    var OpStr = {
      ADD: "+",
      SUB: "-",
      MUL: "times",
      DIV: "div",
      FRAC: "frac",
      EQL: "=",
      ATAN2: "atan2",
      SQRT: "sqrt",
      PM: "pm",
      SIN: "sin",
      COS: "cos",
      TAN: "tan",
      SEC: "sec",
      COT: "cot",
      CSC: "csc",
      LN: "ln",
      VAR: "var",
      CST: "cst",
      COMMA: ",",
      POW: "^",
      ABS: "abs",
      PAREN: "()",
      HIGHLIGHT: "hi",
      EQL: "=",
    };

    var tokenToOperator = [ ];

    var T0=TK_NONE, T1=TK_NONE;

    tokenToOperator[TK_FRAC]  = OpStr.FRAC;
    tokenToOperator[TK_SQRT]  = OpStr.SQRT;
    tokenToOperator[TK_ADD]   = OpStr.ADD;
    tokenToOperator[TK_SUB]   = OpStr.SUB;
    tokenToOperator[TK_PM]  = OpStr.PM;
    tokenToOperator[TK_CARET] = OpStr.POW;
    tokenToOperator[TK_MUL]   = OpStr.MUL;
    tokenToOperator[TK_DIV]   = OpStr.FRAC;
    tokenToOperator[TK_SIN]   = OpStr.SIN;
    tokenToOperator[TK_COS]   = OpStr.COS;
    tokenToOperator[TK_TAN]   = OpStr.TAN;
    tokenToOperator[TK_SEC]   = OpStr.SEC;
    tokenToOperator[TK_COT]   = OpStr.COT;
    tokenToOperator[TK_CSC]   = OpStr.CSC;
    tokenToOperator[TK_LN]  = OpStr.LN;
    tokenToOperator[TK_EQL]   = OpStr.EQL;

    var scan = scanner(src);

    return {
      expr : expr ,
    };

    // begin private functions

    function start() {
      T0 = scan.start();
    }

    function hd () {
      //assert(T0!==0, "hd() T0===0");
      return T0;
    }

    function lexeme () {
      return scan.lexeme();
    }

    function matchToken (t) {
      if (T0 == t) {
        next();
        return true;
      }
      return false;
    }

    function next () {
      T0 = T1;
      T1 = TK_NONE;
      if (T0 === TK_NONE) {
        T0 = scan.start();
      }
    }
    
    function replace (t) {
      T0 = t;
    }

    function eat (tc) {
      var tk = hd();
      if (tk !== tc) {
        assert(false, "Expecting " + tc + " found " + tk);
        jQuery.error("syntax error");
      }
      next();
    }
    
    function match (tc) {
      var tk = hd();
      if (tk !== tc)
        return false;
      next();
      return true;
    }

    function primaryExpr () {
      var e;
      var t;
      var op;
      switch ((t=hd())) {
      case 'A'.charCodeAt(0):
        e = {op: "var", args: [lexeme()]};
        next();
        break;
      case 'a'.charCodeAt(0):
        e = {op: "var", args: [lexeme()]};
        next();
        break;
      case TK_NUM:
        e = Number(lexeme());
        next();
        break;
      case TK_LEFTPAREN:
        e = parenExpr();
        break;
      case TK_FRAC:
        next();
        e = {op: tokenToOperator[TK_FRAC], args: [braceExpr(), braceExpr()]};
        break;
      case TK_SQRT:
        next();
        switch(hd()) {
        case TK_LEFTBRACKET:
          e = {op: tokenToOperator[TK_SQRT], args: [bracketExpr(), braceExpr()]};
          break;
        case TK_LEFTBRACE:
          e = {op: tokenToOperator[TK_SQRT], args: [braceExpr()]};
          break;
        default:
          assert(false);
          break;
        }
        break;
      case TK_SIN:
      case TK_COS:
      case TK_TAN:
      case TK_SEC:
      case TK_COT:
      case TK_CSC:
      case TK_LN:
        next();
        e = {op: tokenToOperator[t], args: [braceExpr()]};
        break;
      default:
        e = void 0;
        break;
      }
      return e;
    }

    function braceExpr() {
      eat(TK_LEFTBRACE);
      var e = commaExpr();
      eat(TK_RIGHTBRACE);
      return e;
    }

    function bracketExpr() {
      eat(TK_LEFTBRACKET);
      var e = commaExpr();
      eat(TK_RIGHTBRACKET);
      return e;
    }

    function parenExpr() {
      eat(TK_LEFTPAREN);
      var e = commaExpr();
      eat(TK_RIGHTPAREN);
      return e;
    }

    function unaryExpr() {
      var t;
      var expr;
      switch (t = hd()) {
      case TK_ADD:
        next();
        expr = unaryExpr();
        break;
      case TK_SUB:
        next();
        expr = negate(unaryExpr());
        break;
      default:
        expr = primaryExpr();
        break;
      }
      return expr;
    }

    function exponentialExpr() {
      var expr = unaryExpr();
      var t;
      while ((t=hd())===TK_CARET) {
        next();
        var expr2 = unaryExpr();
        if (expr2===1) {
          expr = expr;
        }
        else if (expr2===0) {
          expr = 1;
        }
        else {
          expr = {op: tokenToOperator[t], args: [expr, expr2]};
        }
      }

      return expr;
    }

    function multiplicativeExpr() {
      var expr = exponentialExpr();
      var t;

      while((t=hd())===TK_VAR || t===TK_LEFTPAREN) {
        var expr2 = exponentialExpr();
        if (expr2 === 1) {
          expr = expr;
        }
        else if (expr === 1) {
          expr = expr2;
        }
        else {
          expr = {op: OpStr.MUL, args: [expr, expr2]};
        }
      }

      while (isMultiplicative(t = hd())) {
        next();
        var expr2 = exponentialExpr();
        if (expr2===1) {
          expr = expr;
        }
        else if (t===TK_MUL && expr===1) {
          expr = expr2;
        }
        else {
          expr = {op: tokenToOperator[t], args: [expr, expr2]};
        }
      }
      return expr;

      function isMultiplicative(t) {
        return t===TK_MUL || t===TK_DIV;
      }
    }

    function isNeg(n) {
      if (jQuery.type(n)==="number") {
        return n < 0;
      }
      else if (n.args.length===1) {
        return n.op===OpStr.SUB && n.args[0] > 0;  // is unary minus
      }
      else if (n.args.length===2) {
        return n.op===OpStr.MUL && isNeg(n.args[0]);  // leading term is neg
      }
    }

    function negate(n) {
      if (jQuery.type(n)==="number") {
        return -n;
      }
      else if (n.args.length===1 && n.op===OpStr.SUB) {
        return n.args[0];  // strip the unary minus
      }
      else if (n.args.length===2 && n.op===OpStr.MUL && isNeg(n.args[0])) {
        return {op: n.op, args: [negate(n.args[0]), n.args[1]]};
      }
      assert(false);
      return n;
      
    }

    function additiveExpr() {
      var expr = multiplicativeExpr();
      var t;
      while (isAdditive(t = hd())) {
        next();
        var expr2 = multiplicativeExpr();
        if (t===TK_ADD && isNeg(expr2)) {
          t = TK_SUB;
          expr2 = negate(expr2);
        }
        expr = {op: tokenToOperator[t], args: [expr, expr2]};
      }
      return expr;

      function isAdditive(t) {
        return t===TK_ADD || t===TK_SUB || t===TK_PM;
      }
    }

    function equalExpr() {
      var expr = additiveExpr();
      var t;
      while ((t = hd())===TK_EQL) {
        next();
        var expr2 = additiveExpr();
        expr = {op: tokenToOperator[t], args: [expr, expr2]};
      }
      return expr;

    }

    function commaExpr ( ) {
      var n = equalExpr();
      return n;
    }

    function expr ( ) {
      start();
      var n = commaExpr();
      return n;
    }

    function scanner(src) {

      var curIndex = 0;
      var lexeme = "";

      var lexemeToToken = [ ];

      lexemeToToken["\\times"] = TK_MUL;
      lexemeToToken["\\div"]   = TK_DIV;
      lexemeToToken["\\frac"]  = TK_FRAC;
      lexemeToToken["\\sqrt"]  = TK_SQRT;
      lexemeToToken["\\pm"]   = TK_PM;
      lexemeToToken["\\sin"]   = TK_SIN;
      lexemeToToken["\\cos"]   = TK_COS;
      lexemeToToken["\\tan"]   = TK_TAN;
      lexemeToToken["\\sec"]   = TK_SEC;
      lexemeToToken["\\cot"]   = TK_COT;
      lexemeToToken["\\csc"]   = TK_CSC;
      lexemeToToken["\\ln"]   = TK_LN;

      return {
        start : start ,
        lexeme : function () { return lexeme } ,
      }

      // begin private functions

      function start () {
        var c;
        lexeme = "";
        while (curIndex < src.length) {
          switch ((c = src.charCodeAt(curIndex++))) {
          case 32:  // space
          case 9:   // tab
          case 10:  // new line
          case 13:  // carriage return
            continue;
          case 92:  // backslash
            lexeme += String.fromCharCode(c);
            return latex();
          case 40:  // left paren
          case 41:  // right paren
          case 42:  // asterisk
          case 43:  // plus
          case 44:  // comma
          case 45:  // dash
          case 47:  // slash
          case 61:  // equal
          case 91:  // left bracket
          case 93:  // right bracket
          case 94:  // caret
          case 123: // left brace
          case 125: // right brace
            lexeme += String.fromCharCode(c);
            return c; // char code is the token id
          default:
            if (c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) {
              lexeme += String.fromCharCode(c);
              return TK_COEFF;
            }
            else if (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) {
              lexeme += String.fromCharCode(c);
              return TK_VAR;
            }
            else if (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)) {
              //lexeme += String.fromCharCode(c);
              //c = src.charCodeAt(curIndex++);
              //return TK_NUM;
              return number(c);
            }
            else {
              assert( false, "scan.start(): c="+c);
              return 0;
            }
          }
        }
        return 0;
      }

      function number(c) {
        while (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)) {
          lexeme += String.fromCharCode(c);
          c = src.charCodeAt(curIndex++);
        }
        curIndex--;
        
        return TK_NUM;
      }

      function latex() {
        var c = src.charCodeAt(curIndex++);
        while (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) {
          lexeme += String.fromCharCode(c);
          c = src.charCodeAt(curIndex++);
        }
        curIndex--;

        var tk = lexemeToToken[lexeme];
        if (tk===void 0) {
          tk = TK_VAR;   // e.g. \\theta
        }
        return tk;
      }

    }
  }


  // Parse LaTex into an AST.
  Ast.prototype.fromLaTex = function fromLaTeX(str, model) {
    if (model===void 0) {
      model = MathModel.init();   // default model
    }
    return model.parse(str);
  };

  // Render an AST into LaTex.
  Ast.prototype.toLaTex = function toLaTeX(n, model) {
    if (model===void 0) {
      model = MathModel.init();   // default model
    }
    return model.format(n, "large", BLUE);
  };

  // Evaluate a node using the registered model.
  Ast.prototype.eval = function eval(n) {
    assert(false);
    return void 0;
  };

})(Model);