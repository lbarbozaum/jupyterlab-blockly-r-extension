//AO: Modified from blockly-3.20191014.4/generators/javascript.js
// using additional examples from lua.js
// and inlining relevant modified blocks from blockly-3.20191014.4/generators/javascript
import Blockly from 'blockly';
import '@blockly/block-plus-minus'; //AO: 20220223 trying plus/minus for UI improvement generally but %>% improvement specifically


/**
 * R code generator.
 * @type {!Blockly.Generator}
 */
Blockly.R = new Blockly.Generator('R');

//AO: 20220221 importWithSideEffects does not work in deploy - the module is never loaded
// adding a dummy export causes the module to load
export const empty_string = "";

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.R.addReservedWords(
    'Blockly,' +  // In case JS is evaled in the current window.
    //https://stat.ethz.ch/R-manual/R-devel/library/base/html/Reserved.html
    //AO: not sure if .. can be handled correctly this way
    "if,else,repeat,while,function,for,in,next,break,TRUE,FALSE,NULL,Inf,NaN,NA,NA_integer_,NA_real_,NA_complex_,NA_character_,...,..1,..2,..3,..4,..5,..6,..7,..8,..9");

/**
 * Order of operation ENUMs.
 * https://developer.mozilla.org/en/R/Reference/Operators/Operator_Precedence
 */
Blockly.R.ORDER_ATOMIC = 0;           // 0 "" ...
Blockly.R.ORDER_NEW = 1.1;            // new
Blockly.R.ORDER_MEMBER = 1.2;         // . []
Blockly.R.ORDER_FUNCTION_CALL = 2;    // ()
Blockly.R.ORDER_INCREMENT = 3;        // ++
Blockly.R.ORDER_DECREMENT = 3;        // --
Blockly.R.ORDER_BITWISE_NOT = 4.1;    // ~
Blockly.R.ORDER_UNARY_PLUS = 4.2;     // +
Blockly.R.ORDER_UNARY_NEGATION = 4.3; // -
Blockly.R.ORDER_LOGICAL_NOT = 4.4;    // !
Blockly.R.ORDER_TYPEOF = 4.5;         // typeof
Blockly.R.ORDER_VOID = 4.6;           // void
Blockly.R.ORDER_DELETE = 4.7;         // delete
Blockly.R.ORDER_AWAIT = 4.8;          // await
Blockly.R.ORDER_EXPONENTIATION = 5.0; // **
// AO: switched
Blockly.R.ORDER_DIVISION = 5.1;       // /
Blockly.R.ORDER_MULTIPLICATION = 5.2; // *
// AO: switched
Blockly.R.ORDER_MODULUS = 5.3;        // %
// AO: switched
Blockly.R.ORDER_ADDITION = 6.1;       // +
Blockly.R.ORDER_SUBTRACTION = 6.2;    // -
// AO: switched
Blockly.R.ORDER_BITWISE_SHIFT = 7;    // << >> >>>
Blockly.R.ORDER_RELATIONAL = 8;       // < <= > >=
Blockly.R.ORDER_IN = 8;               // in
Blockly.R.ORDER_INSTANCEOF = 8;       // instanceof
Blockly.R.ORDER_EQUALITY = 9;         // == != === !==
Blockly.R.ORDER_BITWISE_AND = 10;     // &
Blockly.R.ORDER_BITWISE_XOR = 11;     // ^
Blockly.R.ORDER_BITWISE_OR = 12;      // |
Blockly.R.ORDER_LOGICAL_AND = 13;     // &&
Blockly.R.ORDER_LOGICAL_OR = 14;      // ||
Blockly.R.ORDER_CONDITIONAL = 15;     // ?:
Blockly.R.ORDER_ASSIGNMENT = 16;      // = += -= **= *= /= %= <<= >>= ...
Blockly.R.ORDER_YIELD = 17;           // yield
Blockly.R.ORDER_COMMA = 18;           // ,
Blockly.R.ORDER_NONE = 99;            // (...)

/**
 * List of outer-inner pairings that do NOT require parentheses.
 * @type {!Array.<!Array.<number>>}
 */
Blockly.R.ORDER_OVERRIDES = [
  // (foo()).bar -> foo().bar
  // (foo())[0] -> foo()[0]
  [Blockly.R.ORDER_FUNCTION_CALL, Blockly.R.ORDER_MEMBER],
  // (foo())() -> foo()()
  [Blockly.R.ORDER_FUNCTION_CALL, Blockly.R.ORDER_FUNCTION_CALL],
  // (foo.bar).baz -> foo.bar.baz
  // (foo.bar)[0] -> foo.bar[0]
  // (foo[0]).bar -> foo[0].bar
  // (foo[0])[1] -> foo[0][1]
  [Blockly.R.ORDER_MEMBER, Blockly.R.ORDER_MEMBER],
  // (foo.bar)() -> foo.bar()
  // (foo[0])() -> foo[0]()
  [Blockly.R.ORDER_MEMBER, Blockly.R.ORDER_FUNCTION_CALL],

  // !(!foo) -> !!foo
  [Blockly.R.ORDER_LOGICAL_NOT, Blockly.R.ORDER_LOGICAL_NOT],
  // a * (b * c) -> a * b * c
  [Blockly.R.ORDER_MULTIPLICATION, Blockly.R.ORDER_MULTIPLICATION],
  // a + (b + c) -> a + b + c
  [Blockly.R.ORDER_ADDITION, Blockly.R.ORDER_ADDITION],
  // a && (b && c) -> a && b && c
  [Blockly.R.ORDER_LOGICAL_AND, Blockly.R.ORDER_LOGICAL_AND],
  // a || (b || c) -> a || b || c
  [Blockly.R.ORDER_LOGICAL_OR, Blockly.R.ORDER_LOGICAL_OR]
];

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.R.init = function(workspace) {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.R.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  Blockly.R.functionNames_ = Object.create(null);

  if (!Blockly.R.variableDB_) {
    Blockly.R.variableDB_ =
        new Blockly.Names(Blockly.R.RESERVED_WORDS_);
  } else {
    Blockly.R.variableDB_.reset();
  }

  Blockly.R.variableDB_.setVariableMap(workspace.getVariableMap());

  //AO: below seems irrelevant; R does not declare variables in this sense
  // var defvars = [];
  // // Add developer variables (not created or named by the user).
  // var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  // for (var i = 0; i < devVarList.length; i++) {
  //   defvars.push(Blockly.R.variableDB_.getName(devVarList[i],
  //       Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  // }

  // // Add user variables, but only ones that are being used.
  // var variables = Blockly.Variables.allUsedVarModels(workspace);
  // for (var i = 0; i < variables.length; i++) {
  //   defvars.push(Blockly.R.variableDB_.getName(variables[i].getId(),
  //       Blockly.Variables.NAME_TYPE));
  // }

  // // Declare all of the variables.
  // if (defvars.length) {
  //   Blockly.R.definitions_['variables'] =
  //       'var ' + defvars.join(', ') + ';';
  // }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.R.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in Blockly.R.definitions_) {
    definitions.push(Blockly.R.definitions_[name]);
  }
  // Clean up temporary data.
  delete Blockly.R.definitions_;
  delete Blockly.R.functionNames_;
  Blockly.R.variableDB_.reset();
  return definitions.join('\n\n') + '\n\n\n' + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.R.scrubNakedValue = function(line) {
  // return line + ';\n';
  return line + '\n';
};

/**
 * Encode a string as a properly escaped R string, complete with
 * quotes. AO: changed to double quotes
 * @param {string} string Text to encode.
 * @return {string} R string.
 * @private
 */
Blockly.R.quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/"/g, '\\\"');
  return '\"' + string + '\"';
};

/**
 * Encode a string as a properly escaped multiline R string, complete
 * with quotes. AO: changed to double quote
 * @param {string} string Text to encode.
 * @return {string} R string.
 * @private
 */
Blockly.R.multiline_quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  var lines = string.split(/\n/g).map(Blockly.R.quote_);
  return lines.join(' + \"\\n\" +\n');
};

/**
 * Common tasks for generating R from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The R code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} R code with comments and subsequent blocks added.
 * @private
 */
Blockly.R.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      comment = Blockly.utils.string.wrap(comment,
          Blockly.R.COMMENT_WRAP - 3);
      commentCode += Blockly.R.prefixLines(comment + '\n', '# ');
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          var comment = Blockly.R.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blockly.R.prefixLines(comment, '# ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : Blockly.R.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

// AO: seems irrelevant since R is 1 indexed
// /**
//  * Gets a property and adjusts the value while taking into account indexing.
//  * @param {!Blockly.Block} block The block.
//  * @param {string} atId The property ID of the element to get.
//  * @param {number=} opt_delta Value to add.
//  * @param {boolean=} opt_negate Whether to negate the value.
//  * @param {number=} opt_order The highest order acting on this value.
//  * @return {string|number}
//  */
// Blockly.R.getAdjusted = function(block, atId, opt_delta, opt_negate,
//     opt_order) {
//   var delta = opt_delta || 0;
//   var order = opt_order || Blockly.R.ORDER_NONE;
//   if (block.workspace.options.oneBasedIndex) {
//     delta--;
//   }
//   var defaultAtIndex = block.workspace.options.oneBasedIndex ? '1' : '0';
//   if (delta > 0) {
//     var at = Blockly.R.valueToCode(block, atId,
//         Blockly.R.ORDER_ADDITION) || defaultAtIndex;
//   } else if (delta < 0) {
//     var at = Blockly.R.valueToCode(block, atId,
//         Blockly.R.ORDER_SUBTRACTION) || defaultAtIndex;
//   } else if (opt_negate) {
//     var at = Blockly.R.valueToCode(block, atId,
//         Blockly.R.ORDER_UNARY_NEGATION) || defaultAtIndex;
//   } else {
//     var at = Blockly.R.valueToCode(block, atId, order) ||
//         defaultAtIndex;
//   }

//   if (Blockly.isNumber(at)) {
//     // If the index is a naked number, adjust it right now.
//     at = Number(at) + delta;
//     if (opt_negate) {
//       at = -at;
//     }
//   } else {
//     // If the index is dynamic, adjust it in code.
//     if (delta > 0) {
//       at = at + ' + ' + delta;
//       var innerOrder = Blockly.R.ORDER_ADDITION;
//     } else if (delta < 0) {
//       at = at + ' - ' + -delta;
//       var innerOrder = Blockly.R.ORDER_SUBTRACTION;
//     }
//     if (opt_negate) {
//       if (delta) {
//         at = '-(' + at + ')';
//       } else {
//         at = '-' + at;
//       }
//       var innerOrder = Blockly.R.ORDER_UNARY_NEGATION;
//     }
//     innerOrder = Math.floor(innerOrder);
//     order = Math.floor(order);
//     if (innerOrder && order >= innerOrder) {
//       at = '(' + at + ')';
//     }
//   }
//   return at;
// };

// AO: skipping colour.js

//***********************************************************************
//lists.js
Blockly.R.lists = {}

Blockly.R['lists_create_empty'] = function(block) {
  // Create an empty list.
  return ['list()', Blockly.R.ORDER_ATOMIC];
};

Blockly.R['lists_create_with'] = function(block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = Blockly.R.valueToCode(block, 'ADD' + i,
        Blockly.R.ORDER_COMMA) || 'NULL'; //AO: think NULL better than NA here
  }
  var code = 'list(' + elements.join(', ') + ')';
  return [code, Blockly.R.ORDER_ATOMIC];
};

Blockly.R['lists_repeat'] = function(block) {
  // Create a list with one element repeated.
  var element = Blockly.R.valueToCode(block, 'ITEM',
      Blockly.R.ORDER_COMMA) || 'NULL'; //AO: think NULL better than NA here
  var repeatCount = Blockly.R.valueToCode(block, 'NUM',
      Blockly.R.ORDER_COMMA) || '0';
  var code = "as.list(rep(" + element +  ', ' + repeatCount + '))';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_length'] = function(block) {
  // String or array length.
  var list = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_MEMBER) || 'list()';
  return [ 'length(' + list + ')', Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var list = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_MEMBER) || 'list()';
  return ['!' + 'length(' + list + ')', Blockly.R.ORDER_LOGICAL_NOT];
};

Blockly.R['lists_indexOf'] = function(block) {
  // Find an item in the list.
  // var operator = block.getFieldValue('END') == 'FIRST' ?
  //     'indexOf' : 'lastIndexOf';
  var item = Blockly.R.valueToCode(block, 'FIND',
      Blockly.R.ORDER_NONE) || '\"\"';
  var list = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_MEMBER) || 'list()';
  var code = ""
  if (block.getFieldValue('END') == 'FIRST') {
    code = 'match(' + item + ',' + list + ')'
  }
  else {
    code = 'length(' + list + ') + 1L - match(' + item + ', rev(' + list + '))'
    //length(l) + 1L - match("j",rev(l))
  }
  //list + '.' + operator + '(' + item + ')';
  // if (block.workspace.options.oneBasedIndex) {
  //   return [code + ' + 1', Blockly.R.ORDER_ADDITION];
  // }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_getIndex'] = function(block) {
  // Get element at index.
  // Note: Until January 2013 this block did not have MODE or WHERE inputs.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var listOrder = (where == 'RANDOM') ? Blockly.R.ORDER_COMMA :
      Blockly.R.ORDER_MEMBER;
  var list = Blockly.R.valueToCode(block, 'VALUE', listOrder) || 'list()';

  switch (where) {
    case ('FIRST'):
      if (mode == 'GET') {
        var code = list + '[1]';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = Blockly.R.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-1]\n' + listVar + '[1]';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[1] <- NULL\n';
      }
      break;
    case ('LAST'): 
      if (mode == 'GET') {
        var code = list + '[length(' + list + ')]';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = Blockly.R.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-length(' + list + ')]\n' + listVar + '[length(' + list + ')]';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[length(' + list + ')] <- NULL\n';
      }
      break;
    case ('FROM_START'):
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      if (mode == 'GET') {
        var code = list + '[' + at + ']';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = Blockly.R.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-' + at + ']\n' + listVar + '[' + at + ']';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[' + at + '] <- NULL\n';
      }
      break;
    case ('FROM_END'):
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      if (mode == 'GET') {
        var code = list + '[length(' + list + ') -' + at + ']';
        return [code, Blockly.R.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE') {
        var listVar = Blockly.R.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-(length(' + list + ') -' + at + ')]\n' + listVar + '[length(' + list + ') -' + at + ']';
        return [code, Blockly.R.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        return list + '[length(' + list + ') -' + at + '] <- NULL\n';
      }
      break;
    case ('RANDOM'):
      var at = 'sample(1:length(' + list + '),1)'
      if (mode == 'GET') {
        var code = list + '[' + at + ']';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = Blockly.R.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var atVar = Blockly.R.variableDB_.getDistinctName(
          'at_var', Blockly.Variables.NAME_TYPE);
        var code = atVar + '<-' + at + '\n' + listVar + '<-' + list + '\n' + list + '<-' + list + '[-' + atVar + ']\n' + listVar + '[' + atVar + ']';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[' + at + '] <- NULL\n';
      }
      break;
  }
  throw Error('Unhandled combination (lists_getIndex).');
};

Blockly.R['lists_setIndex'] = function(block) {
  // Set element at index.
  // Note: Until February 2013 this block did not have MODE or WHERE inputs.
  var list = Blockly.R.valueToCode(block, 'LIST',
      Blockly.R.ORDER_MEMBER) || 'list()';
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var value = Blockly.R.valueToCode(block, 'TO',
      Blockly.R.ORDER_ASSIGNMENT) || 'NULL'; //AO: think NULL better than NA here

  switch (where) {
    case ('FIRST'):
      if (mode == 'SET') {
        return list + '[1] <- ' + value + '\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + '1)\n';
      }
      break;
    case ('LAST'):
      if (mode == 'SET') {
        return list + '[length(' + list + ')] <- ' + value + '\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', length(' + list + '))\n';
      }
      break;
    case ('FROM_START'):
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      if (mode == 'SET') {
        return list + '[' + at + '] <- ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', ' + at + ')\n';
      }
      break;
    case ('FROM_END'):
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      if (mode == 'SET') {
        return list + '[length(' + list + ') -' + at + '] <- ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', length(' + list + ') -' +  at + ')\n';
      }
      break;
    case ('RANDOM'):
      var at = 'sample(1:length(' + list + '),1)'
      if (mode == 'SET') {
        var code = list + '[' + at + '] <- ' + value + ';\n';
        return [code, Blockly.R.ORDER_MEMBER];
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', ' + at + ')\n';
      } 
      break;
  }
  throw Error('Unhandled combination (lists_setIndex).');
};

/**
 * AO: this appears to be internal only....
 * Returns an expression calculating the index into a list.
 * @param {string} listName Name of the list, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string} Index expression.
 * @private
 */
Blockly.R.lists.getIndex_ = function(listName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return 'length(' + listName + ') - ' + opt_at;
  } else if (where == 'LAST') {
    return 'length(' + listName + ')';
  } else {
    return opt_at;
  }
};

Blockly.R['lists_getSublist'] = function(block) {
  // Get sublist.
  var list = Blockly.R.valueToCode(block, 'LIST',
      Blockly.R.ORDER_MEMBER) || 'list()';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = list ;
  } else {
    // If the list is a variable or doesn't require a call for length, don't
    // generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = Blockly.R.valueToCode(block, 'AT1', Blockly.R.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at1 = Blockly.R.valueToCode(block, 'AT1', Blockly.R.ORDER_NONE) ||    '1';
        at1 = 'length(' + list + ') - ' + at1;
        break;
      case 'FIRST':
        var at1 = '1';
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = Blockly.R.valueToCode(block, 'AT2', Blockly.R.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at2 = Blockly.R.valueToCode(block, 'AT2', Blockly.R.ORDER_NONE) ||    '1';
        at2 = 'length(' + list + ') - '  + at2;
        break;
      case 'LAST':
        var at2 = 'length(' + list + ')' ;
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
  code = list + '[' + at1 + ':' + at2 + ']';
  }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_sort'] = function(block) {
  // Block for sorting a list.
  var list = Blockly.R.valueToCode(block, 'LIST',
      Blockly.R.ORDER_FUNCTION_CALL) || 'list()';
  var direction = block.getFieldValue('DIRECTION') === '1' ? 'FALSE' : 'TRUE';
  //AO: doesn't seem like R allows us to mess with type (numeric/alphabetical)
  var type = block.getFieldValue('TYPE');
  var code = 'as.list(sort(unlist(' + list + '), decreasing=' + direction + '))';
  return [code,   Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_split'] = function(block) {
  // Block for splitting text into a list, or joining a list into text.
  var input = Blockly.R.valueToCode(block, 'INPUT',
      Blockly.R.ORDER_MEMBER);
  var delimiter = Blockly.R.valueToCode(block, 'DELIM',
      Blockly.R.ORDER_NONE) || '\"\"';
  var mode = block.getFieldValue('MODE');
  if (mode == 'SPLIT') {
    if (!input) {
      input = '\"\"';
    }
    var code = 'as.list(unlist(strsplit(' + input + ', ' + delimiter + ')))'; //AO note delimiter is regex
  } else if (mode == 'JOIN') {
    if (!input) {
      input = 'list()';
    }
    var code = 'paste0(' + input + ',collapse=' + delimiter + ')';
  } else {
    throw Error('Unknown mode: ' + mode);
  }
  // var code = input + '.' + functionName + '(' + delimiter + ')';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['lists_reverse'] = function(block) {
  // Block for reversing a list.
  var list = Blockly.R.valueToCode(block, 'LIST',
      Blockly.R.ORDER_FUNCTION_CALL) || 'list';
  var code = 'rev(' + list + ')';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

//***********************************************************************
//text.js

Blockly.R['text'] = function(block) {
  // Text value.
  var code = Blockly.R.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.R.ORDER_ATOMIC];
};

Blockly.R['text_multiline'] = function(block) {
  // Text value.
  var code = Blockly.R.multiline_quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.R.ORDER_ATOMIC];
};

/**
 * Enclose the provided value in 'String(...)' function.
 * Leave string literals alone.
 * @param {string} value Code evaluating to a value.
 * @return {string} Code evaluating to a string.
 * @private
 */
Blockly.R.text.forceString_ = function(value) {
  if (Blockly.R.text.forceString_.strRegExp.test(value)) {
    return value;
  }
  return 'toString(' + value + ')';
};

/**
 * Regular expression to detect a single-quoted string literal.
 */
Blockly.R.text.forceString_.strRegExp = /^\s*'([^']|\\')*'\s*$/;

Blockly.R['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  switch (block.itemCount_) {
    case 0:
      return ['\"\"', Blockly.R.ORDER_ATOMIC];
    case 1:
      var element = Blockly.R.valueToCode(block, 'ADD0',
          Blockly.R.ORDER_NONE) || '\"\"';
      var code = Blockly.R.text.forceString_(element);
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
    case 2:
      var element0 = Blockly.R.valueToCode(block, 'ADD0',
          Blockly.R.ORDER_NONE) || '\"\"';
      var element1 = Blockly.R.valueToCode(block, 'ADD1',
          Blockly.R.ORDER_NONE) || '\"\"';
      var code = 'paste0(' + Blockly.R.text.forceString_(element0) + ', ' +
          Blockly.R.text.forceString_(element1) + ')';
      return [code, Blockly.R.ORDER_ADDITION];
    default:
      var elements = new Array(block.itemCount_);
      for (var i = 0; i < block.itemCount_; i++) {
        elements[i] = Blockly.R.valueToCode(block, 'ADD' + i,
            Blockly.R.ORDER_COMMA) || '\"\"';
      }
      var code = 'paste0(' + elements.join(', ') + ')';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
  }
};

Blockly.R['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = Blockly.R.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var value = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_NONE) || '\"\"';
  return varName + ' <- paste0(' + varName + ', ' + Blockly.R.text.forceString_(value) + ')\n';
};

Blockly.R['text_length'] = function(block) {
  // String or array length.
  var text = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_FUNCTION_CALL) || '\"\"';
  var code = 'nchar(' + text + ')';
  return [code, Blockly.R.ORDER_MEMBER];
};

Blockly.R['text_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var text = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  var code = '(is.na(' + text + ') || ' + text + ' == "")';
  return [code, Blockly.R.ORDER_LOGICAL_NOT];
};

Blockly.R['text_indexOf'] = function(block) {
  // Search the text for a substring.
  var operator = block.getFieldValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var substring = Blockly.R.valueToCode(block, 'FIND',
      Blockly.R.ORDER_NONE) || '\"\"';
  var text = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  if( operator === 'indexOf' ) {
    var code = 'regexpr(' + substring + ',' + text + ')';
  } else {
    var reverseText = 'paste(rev(strsplit(' + text + ', "")[[1]]),collapse="")';
    var reverseSubstring = 'paste(rev(strsplit(' + substring + ', "")[[1]]),collapse="")';
    var code = 'nchar(' + text + ') + 1L - nchar(' + substring +') + 1 - regexpr(' + reverseSubstring + ', ' + reverseText + ')';
  }
  // Adjust index if using one-based indices.
  // if (block.workspace.options.oneBasedIndex) {
  //   return [code + ' + 1', Blockly.R.ORDER_ADDITION];
  // }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['text_charAt'] = function(block) {
  // Get letter at index.
  // Note: Until January 2013 this block did not have the WHERE input.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var textOrder = (where == 'RANDOM') ? Blockly.R.ORDER_NONE :
      Blockly.R.ORDER_MEMBER;
  var text = Blockly.R.valueToCode(block, 'VALUE',
      textOrder) || '\"\"';
  switch (where) {
    case 'FIRST':
      var code = 'substr(' + text + ', 1, 1)';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
    case 'LAST':
      var code = 'substr(' + text + ', nchar(' + text + '), nchar(' + text + '))';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
    case 'FROM_START':
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      var code = 'substr(' + text + ', ' + at + ',' + at + ')';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
    case 'FROM_END':
      var at = Blockly.R.valueToCode(block, 'AT', Blockly.R.ORDER_NONE) ||    '1';
      var code = 'substr(' + text + ', nchar(' + text + ') - ' + at + ', nchar(' + text + ') - ' + at + ')';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
    case 'RANDOM':
      var at = 'sample(1:nchar(' + text + '),1)'
      var code = 'substr(' + text + ', ' + at + ',' + at + ')';
      return [code, Blockly.R.ORDER_FUNCTION_CALL];
  }
  throw Error('Unhandled option (text_charAt).');
};

/**
 * Returns an expression calculating the index into a string.
 * @param {string} stringName Name of the string, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string} Index expression.
 * @private
 */
Blockly.R.text.getIndex_ = function(stringName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return stringName + '.length - 1 - ' + opt_at;
  } else if (where == 'LAST') {
    return stringName + '.length - 1';
  } else {
    return opt_at;
  }
};

Blockly.R['text_getSubstring'] = function(block) {
  // Get substring.
  var text = Blockly.R.valueToCode(block, 'STRING',
      Blockly.R.ORDER_FUNCTION_CALL) || '\"\"';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = text;
  } else {
    // If the text is a variable or literal or doesn't require a call for
    // length, don't generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = Blockly.R.valueToCode(block, 'AT1', Blockly.R.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at1 = Blockly.R.valueToCode(block, 'AT1', Blockly.R.ORDER_NONE) ||    '1';
        at1 = 'nchar(' + text + ') - ' + at1 ;
        break;
      case 'FIRST':
        var at1 = '0';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = Blockly.R.valueToCode(block, 'AT2', Blockly.R.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at2 = Blockly.R.valueToCode(block, 'AT2', Blockly.R.ORDER_NONE) ||    '1';
        at2 = 'nchar(' + text + ') - ' + at2 ;
        break;
      case 'LAST':
        var at2 = 'nchar(' + text + ')';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    var code = 'substr(' + text + ', ' + at1 + ', ' + at2 + ')';
  } 
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['text_changeCase'] = function(block) {
  // Change capitalization.
  var operator = block.getFieldValue('CASE');
  var textOrder = operator ? Blockly.R.ORDER_MEMBER :
      Blockly.R.ORDER_NONE;
  var text = Blockly.R.valueToCode(block, 'TEXT',
      textOrder) || '\"\"';
  if (operator === 'UPPERCASE' ) {
    var code = 'toupper(' + text + ')';
  } else if (operator === 'LOWERCASE' ) {
    var code = 'tolower(' + text + ')';
  } else {
    var code = 'tools::toTitleCase(' + text + ')';
  }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['text_trim'] = function(block) {
  // Trim spaces.
  var operator = block.getFieldValue('MODE');
  var text = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  if (operator === 'LEFT' ) {
    var code = 'trimws(' + text + ', "left")';
  } else if (operator === 'RIGHT' ) {
    var code = 'trimws(' + text + ', "right")';
  } else {
    var code = 'trimws(' + text + ', "both")';
  }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['text_print'] = function(block) {
  // Print statement.
  var msg = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_NONE) || '\"\"';
  return 'print(' + msg + ');\n';
};

Blockly.R['text_prompt_ext'] = function(block) {
  // Prompt function.
  if (block.getField('TEXT')) {
    // Internal message.
    var msg = Blockly.R.quote_(block.getFieldValue('TEXT'));
  } else {
    // External message.
    var msg = Blockly.R.valueToCode(block, 'TEXT',
        Blockly.R.ORDER_NONE) || '\"\"';
  }
  var code = 'readline(' + msg + ')';
  var toNumber = block.getFieldValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'as.numeric(' + code + ')';
  }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['text_prompt'] = Blockly.R['text_prompt_ext'];

Blockly.R['text_count'] = function(block) {
  var text = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  var sub = Blockly.R.valueToCode(block, 'SUB',
      Blockly.R.ORDER_NONE) || '\"\"';
  var code = 'lengths(regmatches(' + text + ', gregexpr(' + sub + ', ' + text + ')))';
  return [code, Blockly.R.ORDER_SUBTRACTION];
};

Blockly.R['text_replace'] = function(block) {
  var text = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  var from = Blockly.R.valueToCode(block, 'FROM',
      Blockly.R.ORDER_NONE) || '\"\"';
  var to = Blockly.R.valueToCode(block, 'TO',
      Blockly.R.ORDER_NONE) || '\"\"';
  var code = 'gsub(' + to + ',' + from + ',' + text + ',fixed=TRUE)';
  return [code, Blockly.R.ORDER_MEMBER];
};

Blockly.R['text_reverse'] = function(block) {
  var text = Blockly.R.valueToCode(block, 'TEXT',
      Blockly.R.ORDER_MEMBER) || '\"\"';
  var code = 'paste(rev(strsplit(' + text + ', "")[[1]]),collapse="")';
  return [code, Blockly.R.ORDER_MEMBER];
};

//***********************************************************************
//math.js

Blockly.R['math_number'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('NUM'));
  if (code == Infinity) {
    code = 'Inf';
  } else if (code == -Infinity) {
    code = '-Inf';
  } 
  var order = code >= 0 ? Blockly.R.ORDER_ATOMIC :
              Blockly.R.ORDER_UNARY_NEGATION;
  return [code, order];
};

Blockly.R['math_arithmetic'] = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', Blockly.R.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.R.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.R.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.R.ORDER_DIVISION],
    'POWER': [' ^ ', Blockly.R.ORDER_EXPONENTIATION]  
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.R.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'B', order) || '0';
  var code;
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.R['math_single'] = function(block) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = Blockly.R.valueToCode(block, 'NUM',
        Blockly.R.ORDER_UNARY_NEGATION) || '0';
    code = '-' + arg;
    return [code, Blockly.R.ORDER_UNARY_NEGATION];
  }
  if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = Blockly.R.valueToCode(block, 'NUM',
        Blockly.R.ORDER_DIVISION) || '0';
  } else {
    arg = Blockly.R.valueToCode(block, 'NUM',
        Blockly.R.ORDER_NONE) || '0';
  }
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'log(' + arg + ')';
      break;
    case 'EXP':
      code = 'exp(' + arg + ')';
      break;
    case 'POW10':
      code = '10 ** ' + arg ;
      break;
    case 'ROUND':
      code = 'round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'ceiling(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'sin(' + arg +' *pi/180)';
      break;
    case 'COS':
      code = 'cos(' + arg +' *pi/180)';
      break;
    case 'TAN':
      code = 'tan(' + arg +' *pi/180)';
      break;
  }
  if (code) {
    return [code, Blockly.R.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'log10(' + arg + ')';
      break;
    case 'ASIN':
      code = 'asin(' + arg +' *pi/180)';
      break;
    case 'ACOS':
      code = 'acos(' + arg +' *pi/180)';
      break;
    case 'ATAN':
      code = 'atan(' + arg +' *pi/180)';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Blockly.R.ORDER_DIVISION];
};

Blockly.R['math_constant'] = function(block) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    'PI': ['pi', Blockly.R.ORDER_MEMBER],
    'E': ['exp(1)', Blockly.R.ORDER_MEMBER],
    'GOLDEN_RATIO':
        ['(1 + sqrt(5)) / 2', Blockly.R.ORDER_DIVISION],
    'SQRT2': ['sqrt(2)', Blockly.R.ORDER_MEMBER],
    'SQRT1_2': ['sqrt(.5)', Blockly.R.ORDER_MEMBER],
    'INFINITY': ['Inf', Blockly.R.ORDER_ATOMIC]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Blockly.R['math_number_property'] = function(block) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = Blockly.R.valueToCode(block, 'NUMBER_TO_CHECK',
      Blockly.R.ORDER_MODULUS) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    code = number_to_check + ' == 2L || all(' + number_to_check + ' %% 2L:max(2,floor(sqrt(' + number_to_check + '))) != 0)' ;
    return [code, Blockly.R.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' %% 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' %% 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' %% 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.R.valueToCode(block, 'DIVISOR',
          Blockly.R.ORDER_MODULUS) || '0';
      code = number_to_check + ' %% ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.R.ORDER_EQUALITY];
};

Blockly.R['math_change'] = function(block) {
  // Add to a variable in place.
  var argument0 = Blockly.R.valueToCode(block, 'DELTA',
      Blockly.R.ORDER_ADDITION) || '0';
  var varName = Blockly.R.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ifelse( length(' + varName + ')>0 & is.numeric(' + varName+ '),' + varName + ' + ' + argument0 + ',' + argument0 + ' )';
};

// Rounding functions have a single operand.
Blockly.R['math_round'] = Blockly.R['math_single'];
// Trigonometry functions have a single operand.
Blockly.R['math_trig'] = Blockly.R['math_single'];

Blockly.R['math_on_list'] = function(block) {
  // Math functions for lists.
  var func = block.getFieldValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_MEMBER) || 'list()';
      code = 'sum(unlist(' + list + '))';
      break;
    case 'MIN':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_COMMA) || 'list()';
      code = 'min(unlist(' + list + '))';
      break;
    case 'MAX':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_COMMA) || 'list()';
      code = 'max(unlist(' + list + '))';
      break;
    case 'AVERAGE':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_NONE) || 'list()';
      code = 'mean(unlist(' + list + '))';
      break;
    case 'MEDIAN':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_NONE) || 'list()';
      code = 'median(unlist(' + list + '))';
      break;
    case 'MODE':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_NONE) || 'list()';
      code = 'unique(unlist(' + list + '))[which.max(tabulate(match(' + list + ', unique(unlist(' + list + ')))))]';
      break;
    case 'STD_DEV':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_NONE) || 'list()';
      code = 'sd(unlist(' + list + '))';
      break;
    case 'RANDOM':
      list = Blockly.R.valueToCode(block, 'LIST',
          Blockly.R.ORDER_NONE) || 'list()';
      code = 'list[sample(1:length(' + list + '),1)]';
      break;
    default:
      throw Error('Unknown operator: ' + func);
  }
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['math_modulo'] = function(block) {
  // Remainder computation.
  var argument0 = Blockly.R.valueToCode(block, 'DIVIDEND',
      Blockly.R.ORDER_MODULUS) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'DIVISOR',
      Blockly.R.ORDER_MODULUS) || '0';
  var code = argument0 + ' %% ' + argument1;
  return [code, Blockly.R.ORDER_MODULUS];
};

Blockly.R['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_COMMA) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'LOW',
      Blockly.R.ORDER_COMMA) || '0';
  var argument2 = Blockly.R.valueToCode(block, 'HIGH',
      Blockly.R.ORDER_COMMA) || 'Inf';
  var code = 'min(max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['math_random_int'] = function(block) {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.R.valueToCode(block, 'FROM',
      Blockly.R.ORDER_COMMA) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'TO',
      Blockly.R.ORDER_COMMA) || '0';
  var code = 'sample(' + argument0 + ':' + argument1 + ',1)';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['math_random_float'] = function(block) {
  // Random fraction between 0 and 1.
  return ['runif(1,0,1)', Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['math_atan2'] = function(block) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  var argument0 = Blockly.R.valueToCode(block, 'X',
      Blockly.R.ORDER_COMMA) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'Y',
      Blockly.R.ORDER_COMMA) || '0';
  return ['atan2(' + argument1 + ', ' + argument0 + ') / pi * 180',
      Blockly.R.ORDER_DIVISION];
};

//***********************************************************************
//variables.js

Blockly.R['variables_get'] = function(block) {
  // Variable getter.
  var code = Blockly.R.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.R.ORDER_ATOMIC];
};

Blockly.R['variables_set'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.R.valueToCode(block, 'VALUE',
      Blockly.R.ORDER_NONE) || '0';
  var varName = Blockly.R.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + '\n';
};

//***********************************************************************
//variables_dynamic.js

// AO: not sure what this does...
// R is dynamically typed.
Blockly.R['variables_get_dynamic'] =
    Blockly.R['variables_get'];
Blockly.R['variables_set_dynamic'] =
    Blockly.R['variables_set'];

//***********************************************************************
//logic.js

Blockly.R['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  if (Blockly.R.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.R.injectId(Blockly.R.STATEMENT_PREFIX,
        block);
  }
  do {
    conditionCode = Blockly.R.valueToCode(block, 'IF' + n,
        Blockly.R.ORDER_NONE) || 'FALSE';
    branchCode = Blockly.R.statementToCode(block, 'DO' + n);
    if (Blockly.R.STATEMENT_SUFFIX) {
      branchCode = Blockly.R.prefixLines(
          Blockly.R.injectId(Blockly.R.STATEMENT_SUFFIX,
          block), Blockly.R.INDENT) + branchCode;
    }
    code += (n > 0 ? ' else ' : '') +
        'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || Blockly.R.STATEMENT_SUFFIX) {
    branchCode = Blockly.R.statementToCode(block, 'ELSE');
    if (Blockly.R.STATEMENT_SUFFIX) {
      branchCode = Blockly.R.prefixLines(
          Blockly.R.injectId(Blockly.R.STATEMENT_SUFFIX,
          block), Blockly.R.INDENT) + branchCode;
    }
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Blockly.R['controls_ifelse'] = Blockly.R['controls_if'];

Blockly.R['logic_compare'] = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.R.ORDER_EQUALITY : Blockly.R.ORDER_RELATIONAL;
  var argument0 = Blockly.R.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.R['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||'; //AO: R has both & and &&; && seems appropriate here
  var order = (operator == '&&') ? Blockly.R.ORDER_LOGICAL_AND :
      Blockly.R.ORDER_LOGICAL_OR;
  var argument0 = Blockly.R.valueToCode(block, 'A', order);
  var argument1 = Blockly.R.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'FALSE';
    argument1 = 'FALSE';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == '&&') ? 'TRUE' : 'FALSE';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.R['logic_negate'] = function(block) {
  // Negation.
  var order = Blockly.R.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.R.valueToCode(block, 'BOOL', order) ||
      'TRUE';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.R['logic_boolean'] = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'TRUE' : 'FALSE';
  return [code, Blockly.R.ORDER_ATOMIC];
};

Blockly.R['logic_null'] = function(block) {
  // Null data type.
  return ['NULL', Blockly.R.ORDER_ATOMIC];
};

Blockly.R['logic_ternary'] = function(block) {
  // Ternary operator.
  var value_if = Blockly.R.valueToCode(block, 'IF',
      Blockly.R.ORDER_CONDITIONAL) || 'FALSE';
  var value_then = Blockly.R.valueToCode(block, 'THEN',
      Blockly.R.ORDER_CONDITIONAL) || 'NULL';
  var value_else = Blockly.R.valueToCode(block, 'ELSE',
      Blockly.R.ORDER_CONDITIONAL) || 'NULL';
  var code = 'ifelse(' + value_if + ', ' + value_then + ', ' + value_else + ')'; //AO: this is vectorized ternary; other Blockly languages would not be vectorized here
  return [code, Blockly.R.ORDER_CONDITIONAL];
};

//***********************************************************************
//loops.js

Blockly.R['controls_repeat_ext'] = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(parseInt(block.getFieldValue('TIMES'), 10));
  } else {
    // External number.
    var repeats = Blockly.R.valueToCode(block, 'TIMES',
        Blockly.R.ORDER_NONE) || '0';
  }
  if (Blockly.isNumber(repeats)) {
    repeats = parseInt(repeats, 10);
  } else {
    repeats = 'strtoi(' + repeats + ')';
  }
  var branch = Blockly.R.statementToCode(block, 'DO');
  branch = Blockly.R.addLoopTrap(branch, block);
  var loopVar = Blockly.R.variableDB_.getDistinctName(
      'count', Blockly.Variables.NAME_TYPE);
  var code = 'for (' + loopVar + ' in 1:' + repeats + ') {\n' +
  branch + '}\n';
  return code;
};

Blockly.R['controls_repeat'] = Blockly.R['controls_repeat_ext'];

Blockly.R['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = Blockly.R.valueToCode(block, 'BOOL',
      until ? Blockly.R.ORDER_LOGICAL_NOT :
      Blockly.R.ORDER_NONE) || 'FALSE';
  var branch = Blockly.R.statementToCode(block, 'DO');
  branch = Blockly.R.addLoopTrap(branch, block);
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Blockly.R['controls_for'] = function(block) {
  // For loop.
  var variable0 = Blockly.R.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.R.valueToCode(block, 'FROM',
      Blockly.R.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.R.valueToCode(block, 'TO',
      Blockly.R.ORDER_ASSIGNMENT) || '0';
  var increment = Blockly.R.valueToCode(block, 'BY',
      Blockly.R.ORDER_ASSIGNMENT) || '1';
  var branch = Blockly.R.statementToCode(block, 'DO');
  branch = Blockly.R.addLoopTrap(branch, block);
  //AO: other languages have a lot of complexity; R seems to capture up/down and non integer looping intrinsically
  var code = 'for (' + variable0 + ' in seq(from=' + argument0 + ', to=' + argument1 + ', by=' + increment + ')) {\n' +
  branch + '}\n';
  return code;
};

Blockly.R['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = Blockly.R.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.R.valueToCode(block, 'LIST',
      Blockly.R.ORDER_ASSIGNMENT) || 'list()';
  var branch = Blockly.R.statementToCode(block, 'DO');
  branch = Blockly.R.addLoopTrap(branch, block);
  var code = 'for (' + variable0 + ' in ' + argument0 + ') {\n' + branch + '}\n';
  return code;
};

Blockly.R['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  var xfix = '';
  if (Blockly.R.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    xfix += Blockly.R.injectId(Blockly.R.STATEMENT_PREFIX,
        block);
  }
  if (Blockly.R.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the break/continue is triggered.
    xfix += Blockly.R.injectId(Blockly.R.STATEMENT_SUFFIX,
        block);
  }
  if (Blockly.R.STATEMENT_PREFIX) {
    var loop = Blockly.Constants.Loops
        .CONTROL_FLOW_IN_LOOP_CHECK_MIXIN.getSurroundLoop(block);
    if (loop && !loop.suppressPrefixSuffix) {
      // Inject loop's statement prefix here since the regular one at the end
      // of the loop will not get executed if 'continue' is triggered.
      // In the case of 'break', a prefix is needed due to the loop's suffix.
      xfix += Blockly.R.injectId(Blockly.R.STATEMENT_PREFIX,
          loop);
    }
  }
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return xfix + 'break\n';
    case 'CONTINUE':
      return xfix + 'next\n';
  }
  throw Error('Unknown flow statement.');
};

//***********************************************************************
//procedures.js

Blockly.R['procedures_defreturn'] = function(block) {
  // Define a procedure with a return value.
  var funcName = Blockly.R.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var xfix1 = '';
  if (Blockly.R.STATEMENT_PREFIX) {
    xfix1 += Blockly.R.injectId(Blockly.R.STATEMENT_PREFIX,
        block);
  }
  if (Blockly.R.STATEMENT_SUFFIX) {
    xfix1 += Blockly.R.injectId(Blockly.R.STATEMENT_SUFFIX,
        block);
  }
  if (xfix1) {
    xfix1 = Blockly.R.prefixLines(xfix1, Blockly.R.INDENT);
  }
  var loopTrap = '';
  if (Blockly.R.INFINITE_LOOP_TRAP) {
    loopTrap = Blockly.R.prefixLines(
        Blockly.R.injectId(Blockly.R.INFINITE_LOOP_TRAP,
        block), Blockly.R.INDENT);
  }
  var branch = Blockly.R.statementToCode(block, 'STACK');
  var returnValue = Blockly.R.valueToCode(block, 'RETURN',
      Blockly.R.ORDER_NONE) || '';
  var xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = Blockly.R.INDENT + 'return(' + returnValue + ')';
  }
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Blockly.R.variableDB_.getName(block.arguments_[i],
        Blockly.Variables.NAME_TYPE);
  }
  var code = funcName + ' <- function(' + args.join(', ') + ') {\n' +
      xfix1 + loopTrap + branch + xfix2 + returnValue + '}\n';
  code = Blockly.R.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  Blockly.R.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.R['procedures_defnoreturn'] =
    Blockly.R['procedures_defreturn'];

Blockly.R['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = Blockly.R.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Blockly.R.valueToCode(block, 'ARG' + i,
        Blockly.R.ORDER_COMMA) || 'NULL';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var tuple = Blockly.R['procedures_callreturn'](block);
  return tuple[0] + '\n';
};

Blockly.R['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = Blockly.R.valueToCode(block, 'CONDITION',
      Blockly.R.ORDER_NONE) || 'FALSE';
  var code = 'if (' + condition + ') {\n';
  if (Blockly.R.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code += Blockly.R.prefixLines(
        Blockly.R.injectId(Blockly.R.STATEMENT_SUFFIX, block),
        Blockly.R.INDENT);
  }
  if (block.hasReturnValue_) {
    var value = Blockly.R.valueToCode(block, 'VALUE',
        Blockly.R.ORDER_NONE) || 'NULL';
    code += Blockly.R.INDENT + 'return(' + value + ')\n';
  } else {
    code += Blockly.R.INDENT + 'return(NULL)\n'; //AO: R returns last expression event without a return statement. If we return NULL, we *might* achieve the desired behavior
  }
  code += '}\n';
  return code;
};
//***********************************************************************
//colour.js

Blockly.R['colour_picker'] = function(block) {
  // Colour picker.
  var code = Blockly.R.quote_(block.getFieldValue('COLOUR'));
  return [code, Blockly.R.ORDER_ATOMIC];
};

Blockly.R['colour_random'] = function(block) {
  // Generate a random colour.
  var code = 'rgb(sample(1:255,1),sample(1:255,1),sample(1:255,1),maxColorValue=255)';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['colour_rgb'] = function(block) {
  // Compose a colour from RGB components expressed as percentages.
  var red = Blockly.R.valueToCode(block, 'RED',
      Blockly.R.ORDER_COMMA) || 0;
  var green = Blockly.R.valueToCode(block, 'GREEN',
      Blockly.R.ORDER_COMMA) || 0;
  var blue = Blockly.R.valueToCode(block, 'BLUE',
      Blockly.R.ORDER_COMMA) || 0;
  var code = 'rgb(' + red + ', ' + green + ', ' + blue + ',maxColorValue=255)';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

Blockly.R['colour_blend'] = function(block) {
  // Blend two colours together.
  var c1 = Blockly.R.valueToCode(block, 'COLOUR1',
      Blockly.R.ORDER_COMMA) || '\'#000000\'';
  var c2 = Blockly.R.valueToCode(block, 'COLOUR2',
      Blockly.R.ORDER_COMMA) || '\'#000000\'';
  var ratio = Blockly.R.valueToCode(block, 'RATIO',
      Blockly.R.ORDER_COMMA) || 0.5;
  //AO: this could reasonably be a function, but avoiding that because of current function handling issues
  var code = 'c1 <- col2rgb(' + c1 + ')\n' +
            'c2 <- col2rgb(' + c2 + ')\n' +
            'r <- sqrt((1 - ' + ratio + ') * c1[1]^2 + ' + ratio + '* c2[1]^2)\n' +
            'g <- sqrt((1 - ' + ratio + ') * c1[2]^2 + ' + ratio + '* c2[2]^2)\n' +
            'b <- sqrt((1 - ' + ratio + ') * c1[3]^2 + ' + ratio + '* c2[3]^2)\n' +
            'rgb(r,g,b,maxColorValue=255)';
  return [code, Blockly.R.ORDER_FUNCTION_CALL];
};

// AO: seems we don't want/need to export since we are hanging R off Blockly
// export { Blockly.R }