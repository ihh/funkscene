funkscene_parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "body": parse_body,
        "code": parse_code,
        "named_scene": parse_named_scene,
        "symbol": parse_symbol,
        "scene": parse_scene,
        "choice_list": parse_choice_list,
        "choice": parse_choice,
        "endscene": parse_endscene,
        "spc": parse_spc,
        "quoted_text": parse_quoted_text,
        "text": parse_text
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "body";
      }
      
      var pos = { offset: 0, line: 1, column: 1, seenCR: false };
      var reportFailures = 0;
      var rightmostFailuresPos = { offset: 0, line: 1, column: 1, seenCR: false };
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function clone(object) {
        var result = {};
        for (var key in object) {
          result[key] = object[key];
        }
        return result;
      }
      
      function advance(pos, n) {
        var endOffset = pos.offset + n;
        
        for (var offset = pos.offset; offset < endOffset; offset++) {
          var ch = input.charAt(offset);
          if (ch === "\n") {
            if (!pos.seenCR) { pos.line++; }
            pos.column = 1;
            pos.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            pos.line++;
            pos.column = 1;
            pos.seenCR = true;
          } else {
            pos.column++;
            pos.seenCR = false;
          }
        }
        
        pos.offset += n;
      }
      
      function matchFailed(failure) {
        if (pos.offset < rightmostFailuresPos.offset) {
          return;
        }
        
        if (pos.offset > rightmostFailuresPos.offset) {
          rightmostFailuresPos = clone(pos);
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_body() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_named_scene();
        if (result0 !== null) {
          result1 = parse_body();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, scene, rest) { return scene + rest; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_code();
          if (result0 !== null) {
            result1 = parse_body();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, head, rest) { return head + rest; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            result0 = parse_code();
          }
        }
        return result0;
      }
      
      function parse_code() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2) === "##") {
          result0 = "##";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"##\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_code();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, tail) { return "#" + tail; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (/^[^#]/.test(input.charAt(pos.offset))) {
            result1 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[^#]");
            }
          }
          if (result1 !== null) {
            result0 = [];
            while (result1 !== null) {
              result0.push(result1);
              if (/^[^#]/.test(input.charAt(pos.offset))) {
                result1 = input.charAt(pos.offset);
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("[^#]");
                }
              }
            }
          } else {
            result0 = null;
          }
          if (result0 !== null) {
            result1 = parse_code();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, head, tail) { return head + tail; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            if (/^[^#]/.test(input.charAt(pos.offset))) {
              result1 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[^#]");
              }
            }
            if (result1 !== null) {
              result0 = [];
              while (result1 !== null) {
                result0.push(result1);
                if (/^[^#]/.test(input.charAt(pos.offset))) {
                  result1 = input.charAt(pos.offset);
                  advance(pos, 1);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("[^#]");
                  }
                }
              }
            } else {
              result0 = null;
            }
          }
        }
        return result0;
      }
      
      function parse_named_scene() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 5) === "#PAGE") {
          result0 = "#PAGE";
          advance(pos, 5);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#PAGE\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_spc();
          if (result1 !== null) {
            result2 = parse_symbol();
            if (result2 !== null) {
              result3 = parse_spc();
              if (result3 !== null) {
                result4 = parse_scene();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, name, scene) { return "var " + name + " = " + scene + ";\n"; })(pos0.offset, pos0.line, pos0.column, result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_symbol() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (/^[A-Za-z_]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[A-Za-z_]");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[0-9A-Za-z_]/.test(input.charAt(pos.offset))) {
            result2 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9A-Za-z_]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[0-9A-Za-z_]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9A-Za-z_]");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, first, rest) { return first + rest.join(""); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_scene() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 6) === "#SCENE") {
          result0 = "#SCENE";
          advance(pos, 6);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#SCENE\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_spc();
          if (result1 !== null) {
            result2 = parse_quoted_text();
            if (result2 !== null) {
              result3 = parse_choice_list();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_endscene();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, scene_desc, choices) { return "function() {\n\treturn [" + scene_desc + ",\n\t[" + choices + "]]; }\n"; })(pos0.offset, pos0.line, pos0.column, result0[2], result0[3]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_choice_list() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_choice();
        if (result0 !== null) {
          result1 = parse_choice_list();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, head, tail) { return head + ",\n\t" + tail; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_choice();
        }
        return result0;
      }
      
      function parse_choice() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 7) === "#CHOOSE") {
          result0 = "#CHOOSE";
          advance(pos, 7);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#CHOOSE\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_quoted_text();
          if (result1 !== null) {
            if (input.substr(pos.offset, 4) === "#FOR") {
              result2 = "#FOR";
              advance(pos, 4);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#FOR\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_spc();
              if (result3 !== null) {
                result4 = parse_symbol();
                if (result4 !== null) {
                  result5 = parse_spc();
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, choice_desc, target) { return "[" + choice_desc + "," + target + "]"; })(pos0.offset, pos0.line, pos0.column, result0[1], result0[4]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_endscene() {
        var result0, result1, result2;
        var pos0;
        
        if (input.substr(pos.offset, 9) === "#ENDSCENE") {
          result0 = "#ENDSCENE";
          advance(pos, 9);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#ENDSCENE\"");
          }
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 4) === "#END") {
            result0 = "#END";
            advance(pos, 4);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#END\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_spc();
            if (result1 !== null) {
              if (input.substr(pos.offset, 5) === "SCENE") {
                result2 = "SCENE";
                advance(pos, 5);
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"SCENE\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = clone(pos0);
              }
            } else {
              result0 = null;
              pos = clone(pos0);
            }
          } else {
            result0 = null;
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            if (input.substr(pos.offset, 4) === "#END") {
              result0 = "#END";
              advance(pos, 4);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"#END\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_spc();
              if (result1 !== null) {
                if (input.substr(pos.offset, 6) === "#SCENE") {
                  result2 = "#SCENE";
                  advance(pos, 6);
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"#SCENE\"");
                  }
                }
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = clone(pos0);
                }
              } else {
                result0 = null;
                pos = clone(pos0);
              }
            } else {
              result0 = null;
              pos = clone(pos0);
            }
            if (result0 === null) {
              if (input.substr(pos.offset, 4) === "#END") {
                result0 = "#END";
                advance(pos, 4);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"#END\"");
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_spc() {
        var result0, result1;
        
        result0 = [];
        if (/^[ \t\n\r]/.test(input.charAt(pos.offset))) {
          result1 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\n\\r]");
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          if (/^[ \t\n\r]/.test(input.charAt(pos.offset))) {
            result1 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[ \\t\\n\\r]");
            }
          }
        }
        return result0;
      }
      
      function parse_quoted_text() {
        var result0;
        var pos0;
        
        pos0 = clone(pos);
        result0 = parse_text();
        if (result0 !== null) {
          result0 = (function(offset, line, column, text) { return '"' + text + '"'; })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_text() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2) === "##") {
          result0 = "##";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"##\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_text();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, tail) { return "#" + tail; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.charCodeAt(pos.offset) === 34) {
            result0 = "\"";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\"\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_text();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, tail) { return '\"' + tail; })(pos0.offset, pos0.line, pos0.column, result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (/^[^#"]/.test(input.charAt(pos.offset))) {
              result1 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[^#\"]");
              }
            }
            if (result1 !== null) {
              result0 = [];
              while (result1 !== null) {
                result0.push(result1);
                if (/^[^#"]/.test(input.charAt(pos.offset))) {
                  result1 = input.charAt(pos.offset);
                  advance(pos, 1);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("[^#\"]");
                  }
                }
              }
            } else {
              result0 = null;
            }
            if (result0 !== null) {
              result1 = parse_text();
              if (result1 !== null) {
                result0 = [result0, result1];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, head, tail) { return head + tail; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              if (/^[^#"]/.test(input.charAt(pos.offset))) {
                result1 = input.charAt(pos.offset);
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("[^#\"]");
                }
              }
              if (result1 !== null) {
                result0 = [];
                while (result1 !== null) {
                  result0.push(result1);
                  if (/^[^#"]/.test(input.charAt(pos.offset))) {
                    result1 = input.charAt(pos.offset);
                    advance(pos, 1);
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("[^#\"]");
                    }
                  }
                }
              } else {
                result0 = null;
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, chars) { return chars.join(""); })(pos0.offset, pos0.line, pos0.column, result0);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
            }
          }
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos.offset === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos.offset < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos.offset === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos.offset !== input.length) {
        var offset = Math.max(pos.offset, rightmostFailuresPos.offset);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = pos.offset > rightmostFailuresPos.offset ? pos : rightmostFailuresPos;
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();