/* Proprima: Proto language parser
 *
 * Derived from Esprima
 * From commit: cbed764d67bfb6d38abc9fe62219f3375c076920
 * Modified by Nathan Wall, 2013-2014.
 *
 * Esprima license:
 * Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
 * Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
 * Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
 * Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
 * Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
 * Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
 * Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
 * Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
 * Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * + Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * + Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 * 	 documentation and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function(root, factory) {

	'use strict';

	// Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
	// Rhino, and plain browser loading.
	if (typeof define === 'function' && define.amd)
		define(['exports'], factory);
	else if (typeof exports !== 'undefined')
		factory(exports);
	else
		factory((root.proprima = { }));

}(this, function(exports) {

	'use strict';

	var Token,
		TokenName,
		FnExprTokens,
		Syntax,
		PropertyKind,
		Messages,
		Regex,
		SyntaxTreeDelegate,
		ClassPropertyType,
		source,
		index,
		lineNumber,
		lineStart,
		length,
		delegate,
		lookahead,
		state,
		extra,
		parsingAsExpression,
		HEX_VAL;

	Token = {
		BooleanLiteral: 1,
		EOF: 2,
		Identifier: 3,
		Keyword: 4,
		NilLiteral: 5,
		NumericLiteral: 6,
		Punctuator: 7,
		StringLiteral: 8,
		RegularExpression: 9,
		Template: 10,
		SymbolLiteral: 11,
		SlotExpression: 12
	};

	TokenName = { };
	TokenName[Token.BooleanLiteral] = 'Boolean';
	TokenName[Token.EOF] = '<end>';
	TokenName[Token.Identifier] = 'Identifier';
	TokenName[Token.Keyword] = 'Keyword';
	TokenName[Token.NilLiteral] = 'Nil';
	TokenName[Token.NumericLiteral] = 'Numeric';
	TokenName[Token.Punctuator] = 'Punctuator';
	TokenName[Token.StringLiteral] = 'String';
	TokenName[Token.RegularExpression] = 'RegularExpression';
	TokenName[Token.SymbolLiteral] = 'Symbol';

	// A function following one of those tokens is an expression.
	FnExprTokens = [
		'(', '{', '[', 'in', 'typeof', 'new', 'return', 'case', 'delete',
		'throw', 'void',
		// assignment operators
		'=', '+=', '-=', '*=', '/=', '&=', '^=', ',',
		// binary/unary operators
		'+', '-', '*', '/', 'mod', '++', '--', '&', '|', '^', '!', '&&', '||',
		'?', ':', '==', '>=', '<=', '<', '>', '!=', 'lsh', 'rsh', 'ursh',
		// extensions
		'and', 'or', 'xor', 'not', 'like', '!like', '!in', ':=', '::', '..',
		'...', '??', ':(', '~=', '!~=', 'is', '!is', 'by', 'await', 'each',
		'&&=', '||=', '??=', 'and=', 'or=', 'xor='
		// TODO: Should `yield` be here? Should `await` and `each` be removed?
	];

	Syntax = {
		ArrayExpression: 'ArrayExpression',
		ArrayPattern: 'ArrayPattern',
		AssignmentExpression: 'AssignmentExpression',
		BinaryExpression: 'BinaryExpression',
		BlockStatement: 'BlockStatement',
		BreakStatement: 'BreakStatement',
		CallExpression: 'CallExpression',
		CascadeContext: 'CascadeContext',
		CascadeStatement: 'CascadeStatement',
		CatchClause: 'CatchClause',
		Coercive: 'Coercive',
		ComprehensionExpression: 'ComprehensionExpression',
		ConditionalExpression: 'ConditionalExpression',
		ContinueStatement: 'ContinueStatement',
		DebuggerStatement: 'DebuggerStatement',
		DoWhileStatement: 'DoWhileStatement',
		EmptyStatement: 'EmptyStatement',
		ExportDeclaration: 'ExportDeclaration',
		ExportBatchSpecifier: 'ExportBatchSpecifier',
		ExportSpecifier: 'ExportSpecifier',
		ExpressionStatement: 'ExpressionStatement',
		ForOfStatement: 'ForOfStatement',
		ForStatement: 'ForStatement',
		FunctionDeclaration: 'FunctionDeclaration',
		FunctionExpression: 'FunctionExpression',
		Identifier: 'Identifier',
		IfStatement: 'IfStatement',
		ImportDeclaration: 'ImportDeclaration',
		ImportSpecifier: 'ImportSpecifier',
		LabeledStatement: 'LabeledStatement',
		Literal: 'Literal',
		LogicalExpression: 'LogicalExpression',
		MemberExpression: 'MemberExpression',
		ModuleDeclaration: 'ModuleDeclaration',
		NewExpression: 'NewExpression',
		ObjectExpression: 'ObjectExpression',
		ObjectPattern: 'ObjectPattern',
		PartialApplicationExpression: 'PartialApplicationExpression',
		Program: 'Program',
		Property: 'Property',
		ReturnStatement: 'ReturnStatement',
		SequenceExpression: 'SequenceExpression',
		SlotExpression: 'SlotExpression',
		SpreadElement: 'SpreadElement',
		StatementExpression: 'StatementExpression',
		SwitchCase: 'SwitchCase',
		SwitchStatement: 'SwitchStatement',
		SymbolDeclaration: 'SymbolDeclaration',
		SymbolDeclarator: 'SymbolDeclarator',
		TaggedTemplateExpression: 'TaggedTemplateExpression',
		TemplateElement: 'TemplateElement',
		TemplateLiteral: 'TemplateLiteral',
		ThisExpression: 'ThisExpression',
		ThrowStatement: 'ThrowStatement',
		TryStatement: 'TryStatement',
		UnaryExpression: 'UnaryExpression',
		UpdateExpression: 'UpdateExpression',
		VariableDeclaration: 'VariableDeclaration',
		VariableDeclarator: 'VariableDeclarator',
		WhileStatement: 'WhileStatement',
		YieldExpression: 'YieldExpression'
	};

	PropertyKind = {
		Data: 1,
		Get: 2,
		Set: 4
	};

	ClassPropertyType = {
		static: 'static',
		prototype: 'prototype'
	};

	// Error messages should be identical to V8.
	Messages = {
		UnexpectedToken:
			'Unexpected token %0',
		UnexpectedNumber:
			'Unexpected number',
		UnexpectedString:
			'Unexpected string',
		UnexpectedIdentifier:
			'Unexpected identifier',
		UnexpectedReserved:
			'Unexpected reserved word',
		UnexpectedTemplate:
			'Unexpected quasi %0',
		UnexpectedSymbol:
			'Unexpected symbol',
		UnexpectedEOS:
			'Unexpected end of input',
		NewlineAfterThrow:
			'Illegal newline after throw',
		InvalidRegExp:
			'Invalid regular expression',
		UnterminatedRegExp:
			'Invalid regular expression: missing /',
		MultipleRestSlots:
			'Multiple rest slots are not allowed',
		InvalidLHSInAssignment:
			'Invalid left-hand side in assignment',
		InvalidLHSInFormalsList:
			'Invalid left-hand side in formals list',
		MultipleDefaultsInSwitch:
			'More than one default clause in switch statement',
		NoCatchOrFinally:
			'Missing catch or finally after try',
		UnknownLabel:
			'Undefined label \'%0\'',
		Redeclaration:
			'%0 \'%1\' has already been declared',
		IllegalContinue:
			'Illegal continue statement',
		IllegalBreak:
			'Illegal break statement',
		IllegalReturn:
			'Illegal return statement',
		IllegalYield:
			'Illegal yield expression',
		IllegalAwait:
			'Illegal await expression',
		IllegalSpread:
			'Illegal spread element',
		ParamDupe:
			'Function may not have duplicate parameter names',
		ParameterAfterRestParameter:
			'Rest parameter must be final parameter of an argument list',
		DefaultRestParameter:
			'Rest parameter can not have a default value',
		CoerciveRestParameter:
			'Rest parameter can not have a coercive',
		InvalidCoercive:
			'Invalid coercive or parameter',
		ObjectPatternAsRestParameter:
			'Invalid rest parameter',
		ObjectPatternAsSpread:
			'Invalid spread argument',
		Delete:
			'Delete of an unqualified identifier',
		DuplicateProperty:
			'Duplicate data property in object literal not allowed',
		AccessorDataProperty:
			'Object literal may not have data and accessor property with the '
			+ 'same name',
		AccessorGetSet:
			'Object literal may not have multiple get/set accessors with the '
			+ 'same name',
		NewlineAfterModule:
			'Illegal newline after module',
		NoFromAfterImport:
			'Missing from after import',
		InvalidModuleSpecifier:
			'Invalid module specifier',
		NestedModule:
			'Module declaration can not be nested',
		NoUnintializedConst:
			'Const must be initialized'
	};

	// See also tools/generate-unicode-regex.py.
	Regex = {
		NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
		NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
		WhiteSpace: new RegExp('[\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF]')
	};

	// Initialize HEX_VAL
	(function() {
		var chars = '0123456789abcdef'.split('');
		HEX_VAL = { };
		for (var i = 0; i < chars.length; i++) {
			HEX_VAL[chars[i]] = i;
			if (i > 9)
				HEX_VAL[chars[i].toUpperCase()] = i;
		}
	})();

	// Ensure the condition is true, otherwise throw an error.
	// This is only to have a better contract semantic, i.e. another safety net
	// to catch a logic error. The condition shall be fulfilled in normal case.
	// Do NOT use this to enforce a certain condition on any user input.

	function assert(condition, message) {
		if (!condition)
			throw new Error('ASSERT: ' + message);
	}

	function hasOwn(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	function getStringTag(obj) {
		return Object.prototype.toString.call(obj);
	}

	function isDecimalDigit(ch) {
		return (ch >= 48 && ch <= 57);   // 0..9
	}

	function isHexDigit(ch) {
		return hasOwn(HEX_VAL, ch);
	}

	function isOctalDigit(ch) {
		return '01234567'.indexOf(ch) >= 0;
	}


	// 7.2 White Space

	function isWhiteSpace(ch) {
		return ch === 32  // space
			|| ch === 9   // tab
			|| ch === 0xB
			|| ch === 0xC
			|| ch === 0xA0
			|| ch >= 0x1680 && Regex.WhiteSpace.test(String.fromCharCode(ch));
	}

	// 7.3 Line Terminators

	function isLineTerminator(ch) {
		return ch === 10 || ch === 13 || ch === 0x2028 || ch === 0x2029;
	}

	// 7.6 Identifier Names and Identifiers

	function isIdentifierStart(ch) {
		return ch === 36                // $ (dollar)
			|| ch === 95                 // _ (underscore)
			|| ch >= 65 && ch <= 90     // A..Z
			|| ch >= 97 && ch <= 122    // a..z
			|| ch === 92                // \ (backslash)
			|| ch >= 0x80
				&& Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
	}

	function isIdentifierPart(ch) {
		return (ch === 36) || (ch === 95)  // $ (dollar) and _ (underscore)
			|| (ch >= 65 && ch <= 90)      // A..Z
			|| (ch >= 97 && ch <= 122)     // a..z
			|| (ch >= 48 && ch <= 57)      // 0..9
			|| (ch === 92)                 // \ (backslash)
			|| ((ch >= 0x80)
				&& Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
	}

	// 7.6.1.2 Future Reserved Words

	function isFutureReservedWord(id) {
		switch (id) {
		case 'enum':
		case 'extends':
		case 'super':
		case 'implements':
		case 'interface':
		case 'package':
		case 'private':
		case 'protected':
		case 'public':
			return true;
		default:
			return false;
		}
	}

	// 7.6.1.1 Keywords

	function isKeyword(id) {
		// Some are from future reserved words.
		switch (id.length) {
		case 2:
			return id === 'if' || id === 'in' || id === 'do'
				|| id === 'fn' || id == 'is' || id === 'of'
				|| id === 'by' || id === 'or';
		case 3:
			return id === 'var' || id === 'for' || id === 'new'
				|| id === 'try' || id === 'not' || id === 'sym'
				|| id === 'gen' || id === 'mod' || id === 'and'
				|| id === 'xor';
		case 4:
			return id === 'this' || id === 'else' || id === 'case'
				|| id === 'void' || id === 'with' || id === 'enum'
				|| id === 'like' || id === 'each';
		case 5:
			return id === 'while' || id === 'break' || id === 'catch'
				|| id === 'throw' || id === 'const' || id === 'yield'
				|| id === 'super' || id === 'async' || id === 'await';
		case 6:
			return id === 'return' || id === 'typeof' || id === 'delete'
				|| id === 'switch' || id === 'export' || id === 'import'
				|| id === 'static';
		case 7:
			return id === 'default' || id === 'finally' || id === 'extends';
		case 8:
			return id === 'continue' || id === 'debugger';
		default:
			return false;
		}
	}

	// 7.4 Comments

	function skipComment() {

		var ch, blockComment, lineComment;

		blockComment = false;
		lineComment = false;

		while (index < length) {
			ch = source.charCodeAt(index);

			if (lineComment) {
				++index;
				if (isLineTerminator(ch)) {
					lineComment = false;
					if (ch === 13 && source.charCodeAt(index) === 10) {
						++index;
					}
					++lineNumber;
					lineStart = index;
				}
			}
			else if (blockComment) {
				if (isLineTerminator(ch)) {
					if (ch === 13 && source.charCodeAt(index + 1) === 10) {
						++index;
					}
					++lineNumber;
					++index;
					lineStart = index;
					if (index >= length) {
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}
				}
				else {
					ch = source.charCodeAt(index++);
					if (index >= length) {
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}
					// Block comment ends with '*/' (char #42, char #47).
					if (ch === 42) {
						ch = source.charCodeAt(index);
						if (ch === 47) {
							++index;
							blockComment = false;
						}
					}
				}
			}
			else if (ch === 47) {
				ch = source.charCodeAt(index + 1);
				// Line comment starts with '//' (char #47, char #47).
				if (ch === 47) {
					index += 2;
					lineComment = true;
				}
				else if (ch === 42) {
					// Block comment starts with '/*' (char #47, char #42).
					index += 2;
					blockComment = true;
					if (index >= length) {
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}
				}
				else
					break;
			}
			else if (isWhiteSpace(ch))
				++index;
			else if (isLineTerminator(ch)) {
				++index;
				if (ch === 13 && source.charCodeAt(index) === 10) {
					++index;
				}
				++lineNumber;
				lineStart = index;
			}
			else
				break;
		}

	}

	function scanHexEscape(prefix) {

		var i, len, code = 0;

		len = (prefix === 'u') ? 4 : 2;
		for (i = 0; i < len; ++i)
			if (index < length && isHexDigit(source[index]))
				code = code * 16 + HEX_VAL[source[index++]];
			else
				return '';

		return String.fromCharCode(code);

	}

	function scanUnicodeCodePointEscape() {

		var ch, code, cu1, cu2;

		ch = source[index];
		code = 0;

		// At least, one hex digit is required.
		if (ch === '}') {
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
		}

		while (index < length) {
			ch = source[index++];
			if (!isHexDigit(ch)) {
				break;
			}
			code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
		}

		if (code > 0x10FFFF || ch !== '}') {
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
		}

		// UTF-16 Encoding
		if (code <= 0xFFFF) {
			return String.fromCharCode(code);
		}
		cu1 = ((code - 0x10000) >> 10) + 0xD800;
		cu2 = ((code - 0x10000) & 1023) + 0xDC00;

		return String.fromCharCode(cu1, cu2);

	}

	function getEscapedIdentifier() {

		var ch, id;

		ch = source.charCodeAt(index++);
		id = String.fromCharCode(ch);

		// '\u' (char #92, char #117) denotes an escaped character.
		if (ch === 92) {
			if (source.charCodeAt(index) !== 117) {
				throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
			}
			++index;
			ch = scanHexEscape('u');
			if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
				throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
			}
			id = ch;
		}

		while (index < length) {

			ch = source.charCodeAt(index);

			if (!isIdentifierPart(ch))
				break;

			++index;
			id += String.fromCharCode(ch);

			// '\u' (char #92, char #117) denotes an escaped character.
			if (ch === 92) {
				id = id.substr(0, id.length - 1);
				if (source.charCodeAt(index) !== 117)
					throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
				++index;
				ch = scanHexEscape('u');
				if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0)))
					throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
				id += ch;
			}

		}

		return id;

	}

	function getIdentifier() {

		var start, ch;

		start = index++;
		while (index < length) {
			ch = source.charCodeAt(index);
			if (ch === 92) {
				// Blackslash (char #92) marks Unicode escape sequence.
				index = start;
				return getEscapedIdentifier();
			}
			if (isIdentifierPart(ch)) {
				++index;
			}
			else
				break;
		}

		return source.slice(start, index);

	}

	function scanIdentifier() {

		var start, id, type;

		start = index;

		// Backslash (char #92) starts an escaped character.
		id = source.charCodeAt(index) === 92
			? getEscapedIdentifier() : getIdentifier();

		// There is no keyword or literal with only one character.
		// Thus, it must be an identifier.
		if (id.length === 1)
			type = Token.Identifier;
		else if (isKeyword(id))
			type = Token.Keyword;
		else if (id === 'nil')
			type = Token.NilLiteral;
		else if (id === 'true' || id === 'false')
			type = Token.BooleanLiteral;
		else if (id === 'inf')
			type = Token.NumericLiteral;
		else
			type = Token.Identifier;

		return {
			type: type,
			value: id,
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}


	// 7.7 Punctuators

	function scanPunctuator() {

		var start = index,
			code = source.charCodeAt(index),
			code2,
			ch1 = source[index],
			ch2, ch3, ch4;

		switch (code) {
		// Check for most common single-character punctuators.
		case 41:   // ) close bracket
		case 59:   // ; semicolon
		case 44:   // , comma
		case 123:  // { open curly brace
		case 93:   // ]
		case 64:   // @
			++index;
			if (extra.tokenize) {
				if (code === 40)
					extra.openParenToken = extra.tokens.length;
				else if (code === 123)
					extra.openCurlyToken = extra.tokens.length;
			}
			return {
				type: Token.Punctuator,
				value: String.fromCharCode(code),
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		code2 = source.charCodeAt(index + 1);
		// '=' (char #61) marks an assignment or comparison operator.
		if (code2 === 61) {
			switch (code) {
			case 38:  // &
			case 42:  // *
			case 43:  // +
			case 45:  // -
			case 47:  // /
			case 60:  // <
			case 62:  // >
			case 94:  // ^
			case 124: // |
			case 58:  // :
			case 126: // ~
				index += 2;
				return {
					type: Token.Punctuator,
					value: String.fromCharCode(code)
						+ String.fromCharCode(code2),
					lineNumber: lineNumber,
					lineStart: lineStart,
					range: [ start, index ]
				};

			case 33: // !
			case 61: // =
				index += 2;
				return {
					type: Token.Punctuator,
					value: source.slice(start, index),
					lineNumber: lineNumber,
					lineStart: lineStart,
					range: [ start, index ]
				};
			default:
				break;
			}
		}

		// Peek more characters.

		ch2 = source[index + 1];
		ch3 = source[index + 2];
		ch4 = source[index + 3];

		// 5-character punctuator: !like

		if (ch1 === '!' && ch2 === 'l' && ch3 === 'i' && ch4 === 'k') {
			if (source[index + 4] === 'e') {
				index += 5;
				return {
					type: Token.Punctuator,
					value: '!like',
					lineNumber: lineNumber,
					lineStart: lineStart,
					range: [ start, index ]
				};
			}
		}

		// 3-character punctuators: ... ::{ !~= !is !in &&= ||= ??= or=

		if (ch1 === '.' && ch2 === '.' && ch3 === '.'
		|| ch1 === ':' && ch2 === ':' && ch3 === '{'
		|| ch1 === '!' && ch2 === '~' && ch3 === '='
		|| ch1 === '!' && ch2 === 'i' && ch3 === 's'
		|| ch1 === '!' && ch2 === 'i' && ch3 === 'n'
		|| ch1 === '&' && ch2 === '&' && ch3 === '='
		|| ch1 === '|' && ch2 === '|' && ch3 === '='
		|| ch1 === '?' && ch2 === '?' && ch3 === '=') {
			index += 3;
			return {
				type: Token.Punctuator,
				value: ch1 + ch2 + ch3,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		// Other 2-character punctuators: ++ -- && || :: .. ??

		if (ch1 === ch2 && ('+-&|:.?'.indexOf(ch1) >= 0)) {
			index += 2;
			return {
				type: Token.Punctuator,
				value: ch1 + ch2,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		// Other 2-character punctuators: #[ :{ :( [: (:
		if (ch1 === '#' && ch2 === '['
		|| ch1 === ':' && ch2 === '{'
		|| ch1 === ':' && ch2 === '('
		|| ch1 === '[' && ch2 === ':'
		|| ch1 === '(' && ch2 === ':') {
			index += 2;
			return {
				type: Token.Punctuator,
				value: ch1 + ch2,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		if ('<>=!+-*&^/#:|?}[('.indexOf(ch1) >= 0) {
			++index;
			return {
				type: Token.Punctuator,
				value: ch1,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		if (ch1 === '.') {
			++index;
			return {
				type: Token.Punctuator,
				value: ch1,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

	}

	// 7.8.3 Numeric Literals

	function scanHexLiteral(start) {

		var number = '';

		while (index < length) {
			if (!isHexDigit(source[index])) {
				break;
			}
			number += source[index++];
		}

		if (number.length === 0) {
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
		}

		if (isIdentifierStart(source.charCodeAt(index))) {
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
		}

		return {
			type: Token.NumericLiteral,
			value: parseInt('0x' + number, 16),
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	function scanOctalLiteral(start) {

		var number, code;

		++index;
		number = '';

		while (index < length && isOctalDigit(source[index]))
			number += source[index++];

		// only 0o or 0O
		if (number.length === 0)
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		code = source.charCodeAt(index);
		if (isIdentifierStart(code) || isDecimalDigit(code))
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		return {
			type: Token.NumericLiteral,
			value: parseInt(number, 8),
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	function scanNumericLiteral() {

		var number, start, ch;

		ch = source[index];
		assert(isDecimalDigit(ch.charCodeAt(0)) || ch === '.',
			'Numeric literal must start with a decimal digit or a decimal '
			+ 'point'
		);

		start = index;
		number = '';

		if (ch !== '.') {

			number = source[index++];
			ch = source[index];

			// Hex number starts with '0x'.
			// Octal number starts with '0o'.
			// Binary number starts with '0b'.
			if (number === '0') {
				if (ch === 'x' || ch === 'X') {
					++index;
					return scanHexLiteral(start);
				}
				if (ch === 'b' || ch === 'B') {

					++index;
					number = '';

					while (index < length) {
						ch = source[index];
						if (ch !== '0' && ch !== '1') {
							break;
						}
						number += source[index++];
					}

					if (number.length === 0) {
						// only 0b or 0B
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}

					if (index < length) {
						ch = source.charCodeAt(index);
						if (isIdentifierStart(ch) || isDecimalDigit(ch))
							throwError(
								{ }, Messages.UnexpectedToken, 'ILLEGAL'
							);
					}

					return {
						type: Token.NumericLiteral,
						value: parseInt(number, 2),
						lineNumber: lineNumber,
						lineStart: lineStart,
						range: [ start, index ]
					};

				}
				if (ch === 'o' || ch === 'O') {
					return scanOctalLiteral(start);
				}
				// A decimal number starting with '0' such as '09' is illegal.
				// This is to help guard against uses where someone may think
				// a leading '0' indicates an octal number.
				if (ch && isDecimalDigit(ch.charCodeAt(0)))
					throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
			}

			while (isDecimalDigit(source.charCodeAt(index)))
				number += source[index++];

			ch = source[index];

		}

		if (ch === '.' && isDecimalDigit(source.charCodeAt(index + 1))) {
			number += source[index++];
			while (isDecimalDigit(source.charCodeAt(index)))
				number += source[index++];
			ch = source[index];
		}

		if (ch === 'e' || ch === 'E') {

			number += source[index++];

			ch = source[index];
			if (ch === '+' || ch === '-')
				number += source[index++];
			if (isDecimalDigit(source.charCodeAt(index))) {
				while (isDecimalDigit(source.charCodeAt(index)))
					number += source[index++];
			}
			else
				throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		}

		if (isIdentifierStart(source.charCodeAt(index)))
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		return {
			type: Token.NumericLiteral,
			value: parseFloat(number),
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	// 7.8.4 String Literals

	function scanStringLiteral() {

		var str = '', quote, start, ch, code, unescaped, restore;

		quote = source[index];
		assert(quote === '\'' || quote === '"',
			'String literal must starts with a quote'
		);

		start = index;
		++index;

		while (index < length) {
			ch = source[index++];

			if (ch === quote) {
				quote = '';
				break;
			}
			else if (ch === '\\') {
				ch = source[index++];
				if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
					switch (ch) {
					case 'n':
						str += '\n';
						break;
					case 'r':
						str += '\r';
						break;
					case 't':
						str += '\t';
						break;
					case 'u':
					case 'x':
						if (source[index] === '{') {
							++index;
							str += scanUnicodeCodePointEscape();
						}
						else {
							restore = index;
							unescaped = scanHexEscape(ch);
							if (unescaped)
								str += unescaped;
							else {
								index = restore;
								str += ch;
							}
						}
						break;
					case 'b':
						str += '\b';
						break;
					case 'f':
						str += '\f';
						break;
					case 'v':
						str += '\x0B';
						break;

					default:
						str += ch;
						break;
					}
				}
				else {
					++lineNumber;
					if (ch === '\r' && source[index] === '\n') {
						++index;
					}
				}
			}
			else if (isLineTerminator(ch.charCodeAt(0)))
				break;
			else
				str += ch;
		}

		if (quote !== '')
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		return {
			type: Token.StringLiteral,
			value: str,
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	function scanTemplate() {

		var cooked, ch, start, terminated, tail, restore, unescaped, code;

		cooked = '';
		terminated = false;
		tail = false;
		start = index;

		++index;

		while (index < length) {
			ch = source[index++];
			if (ch === '`') {
				tail = true;
				terminated = true;
				break;
			}
			else if (ch === '$') {
				if (source[index] === '{') {
					++index;
					terminated = true;
					break;
				}
				cooked += ch;
			}
			else if (ch === '\\') {
				ch = source[index++];
				if (!isLineTerminator(ch.charCodeAt(0))) {
					switch (ch) {
					case 'n':
						cooked += '\n';
						break;
					case 'r':
						cooked += '\r';
						break;
					case 't':
						cooked += '\t';
						break;
					case 'u':
					case 'x':
						if (source[index] === '{') {
							++index;
							cooked += scanUnicodeCodePointEscape();
						}
						else {
							restore = index;
							unescaped = scanHexEscape(ch);
							if (unescaped)
								cooked += unescaped;
							else {
								index = restore;
								cooked += ch;
							}
						}
						break;
					case 'b':
						cooked += '\b';
						break;
					case 'f':
						cooked += '\f';
						break;
					case 'v':
						cooked += '\v';
						break;

					default:
						cooked += ch;
						break;
					}
				}
				else {
					++lineNumber;
					if (ch === '\r' && source[index] === '\n') {
						++index;
					}
				}
			}
			else if (isLineTerminator(ch.charCodeAt(0))) {
				++lineNumber;
				if (ch === '\r' && source[index] === '\n') {
					++index;
				}
				cooked += '\n';
			}
			else
				cooked += ch;
		}

		if (!terminated)
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		return {
			type: Token.Template,
			value: {
				cooked: cooked,
				raw: source.slice(start + 1, index - ((tail) ? 1 : 2))
			},
			tail: tail,
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	function scanTemplateElement(option) {

		var startsWith, template;

		lookahead = null;
		skipComment();

		startsWith = (option.head) ? '`' : '}';

		if (source[index] !== startsWith)
			throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');

		template = scanTemplate();

		peek();

		return template;

	}

	function scanRegExp() {

		var str, ch, start, pattern, flags, value, classMarker, restore,
			terminated;

		classMarker = false;
		terminated = false
		lookahead = null;
		skipComment();

		start = index;
		ch = source[index];
		assert(ch === '/',
			'Regular expression literal must start with a slash'
		);
		str = source[index++];

		while (index < length) {
			ch = source[index++];
			str += ch;
			if (classMarker) {
				if (ch === ']')
					classMarker = false;
			}
			else {
				if (ch === '\\') {
					ch = source[index++];
					// ECMA-262 7.8.5
					if (isLineTerminator(ch.charCodeAt(0))) {
						throwError({ }, Messages.UnterminatedRegExp);
					}
					str += ch;
				}
				else if (ch === '/') {
					terminated = true;
					break;
				}
				else if (ch === '[')
					classMarker = true;
				else if (isLineTerminator(ch.charCodeAt(0)))
					throwError({ }, Messages.UnterminatedRegExp);
			}
		}

		if (!terminated)
			throwError({ }, Messages.UnterminatedRegExp);

		// Exclude leading and trailing slash.
		pattern = str.substr(1, str.length - 2);

		flags = '';
		while (index < length) {
			ch = source[index];
			if (!isIdentifierPart(ch.charCodeAt(0))) {
				break;
			}

			++index;
			if (ch === '\\' && index < length) {
				ch = source[index];
				if (ch === 'u') {
					++index;
					restore = index;
					ch = scanHexEscape('u');
					if (ch) {
						flags += ch;
						for (str += '\\u'; restore < index; ++restore)
							str += source[restore];
					}
					else {
						index = restore;
						flags += 'u';
						str += '\\u';
					}
				}
				else
					str += '\\';
			}
			else {
				flags += ch;
				str += ch;
			}
		}

		try {
			value = new RegExp(pattern, flags);
		}
		catch (e) {
			throwError({ }, Messages.InvalidRegExp);
		}

		peek();


		if (extra.tokenize) {
			return {
				type: Token.RegularExpression,
				value: value,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ start, index ]
			};
		}

		return {
			literal: str,
			value: value,
			range: [ start, index ]
		};

	}

	function scanSymbolLiteral() {

		var ch, str, start;

		lookahead = null;
		skipComment();

		start = index;
		ch = source[index];
		assert(ch === '@', 'Symbol must start with an at sign (@)');
		str = source[index++] + getIdentifier();

		return {
			type: Token.SymbolLiteral,
			value: str,
			lineNumber: lineNumber,
			lineStart: lineStart,
			range: [ start, index ]
		};

	}

	function isIdentifierName(token) {
		return token.type === Token.Identifier
			|| token.type === Token.Keyword
			|| token.type === Token.BooleanLiteral
			|| token.type === Token.NilLiteral;
	}

	function advanceSlash() {
		var prevToken, checkToken;
		// Using the following algorithm:
		// https://github.com/mozilla/sweet.js/wiki/design
		prevToken = extra.tokens[extra.tokens.length - 1];
		if (!prevToken) {
			// Nothing before that: it cannot be a division.
			return scanRegExp();
		}
		if (prevToken.type === 'Punctuator') {
			if (prevToken.value === ')') {
				checkToken = extra.tokens[extra.openParenToken - 1];
				if (checkToken && checkToken.type === 'Keyword'
				&& (
					checkToken.value === 'if'
 					|| checkToken.value === 'while'
 					|| checkToken.value === 'for'
				))
					return scanRegExp();
				return scanPunctuator();
			}
			if (prevToken.value === '}') {
				// Dividing a function by anything makes little sense,
				// but we have to check for that.
				if (extra.tokens[extra.openCurlyToken - 3]
				&& extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
					// Anonymous function.
					checkToken = extra.tokens[extra.openCurlyToken - 4];
					if (!checkToken)
						return scanPunctuator();
				}
				else if (extra.tokens[extra.openCurlyToken - 4]
				&& extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
					// Named function.
					checkToken = extra.tokens[extra.openCurlyToken - 5];
					if (!checkToken)
						return scanRegExp();
				}
				else
					return scanPunctuator();
				// checkToken determines whether the function is
				// a declaration or an expression.
				if (FnExprTokens.indexOf(checkToken.value) >= 0)
					// It is an expression.
					return scanPunctuator();
				// It is a declaration.
				return scanRegExp();
			}
			return scanRegExp();
		}
		if (prevToken.type === 'Keyword')
			return scanRegExp();
		return scanPunctuator();
	}

	function advance() {

		var ch;

		skipComment();

		if (index >= length) {
			return {
				type: Token.EOF,
				lineNumber: lineNumber,
				lineStart: lineStart,
				range: [ index, index ]
			};
		}

		ch = source.charCodeAt(index);

		// Very common: ( and ) and :
		if (ch === 40 || ch === 41 || ch === 58) {
			return scanPunctuator();
		}

		// String literal starts with single quote (#39) or double quote (#34).
		if (ch === 39 || ch === 34) {
			return scanStringLiteral();
		}

		if (ch === 96) {
			return scanTemplate();
		}
		if (isIdentifierStart(ch)) {
			return scanIdentifier();
		}

		// Dot (.) char #46 can also start a floating-point number, hence the
		// need to check the next character.
		if (ch === 46) {
			if (isDecimalDigit(source.charCodeAt(index + 1))) {
				return scanNumericLiteral();
			}
			return scanPunctuator();
		}

		if (isDecimalDigit(ch)) {
			return scanNumericLiteral();
		}

		// Slash (/) char #47 can also start a regex.
		if (extra.tokenize && ch === 47) {
			return advanceSlash();
		}

		// @ starts a symbol
		if (ch === 64) {
			return scanSymbolLiteral();
		}

		return scanPunctuator();

	}

	function lex() {

		var token;

		token = lookahead;
		index = token.range[1];
		lineNumber = token.lineNumber;
		lineStart = token.lineStart;

		lookahead = advance();

		index = token.range[1];
		lineNumber = token.lineNumber;
		lineStart = token.lineStart;

		return token;

	}

	// Useful when two smaller tokens combine to make a larger token, such as
	// `#[`, which could be interpreted as `#` and `[` individually in some
	// contexts. `lexSplit` will return the first `charCount` characters as
	// a token and leave the pointer such that the next token can be accessed
	// with a subsequent call to `lex` or `lexSplit`.
	function lexSplit(charCount) {
		var token = lex(),
			len = token.value.length;
		token.value = token.value.slice(0, charCount);
		// TODO: Is it correct for `lineStart` to be set to the following
		// value?
		lineStart = index = token.range[1] -= len - charCount;
		peek();
		return token;
	}

	function peek() {
		var pos, line, start;
		pos = index;
		line = lineNumber;
		start = lineStart;
		lookahead = advance();
		index = pos;
		lineNumber = line;
		lineStart = start;
	}

	function lookahead2() {

		var adv, pos, line, start, result;

		// If we are collecting the tokens, don't grab the next one yet.
		adv = (typeof extra.advance === 'function') ? extra.advance : advance;

		pos = index;
		line = lineNumber;
		start = lineStart;

		// Scan for the next immediate token.
		if (lookahead === null) {
			lookahead = adv();
		}
		index = lookahead.range[1];
		lineNumber = lookahead.lineNumber;
		lineStart = lookahead.lineStart;

		// Grab the token right after.
		result = adv();
		index = pos;
		lineNumber = line;
		lineStart = start;

		return result;

	}

	SyntaxTreeDelegate = {

		name: 'SyntaxTree',

		postProcess: function(node) {
			return node;
		},

		createArrayExpression: function(elements) {
			return {
				type: Syntax.ArrayExpression,
				elements: elements
			};
		},

		createAssignmentExpression: function(operator, left, right) {
			return {
				type: Syntax.AssignmentExpression,
				operator: operator,
				left: left,
				right: right
			};
		},

		createBinaryExpression: function(operator, left, right) {
			return {
				type: operator === '||'
					|| operator === '&&'
					|| operator === '??'
					? Syntax.LogicalExpression : Syntax.BinaryExpression,
				operator: operator,
				left: left,
				right: right
			};
		},

		createBlockStatement: function(body) {
			return {
				type: Syntax.BlockStatement,
				body: body
			};
		},

		createBreakStatement: function(label) {
			return {
				type: Syntax.BreakStatement,
				label: label
			};
		},

		createCallExpression: function(callee, args) {
			return {
				type: Syntax.CallExpression,
				callee: callee,
				'arguments': args
			};
		},

		createPartialApplicationExpression: function(callee, args) {
			// Enforce only 1 rest slot
			var restFound = false;
			for (var i = 0; i < args.length; i++)
				if (args[i].type == Syntax.SlotExpression && args[i].rest) {
					if (restFound)
						throwError({ }, Messages.MultipleRestSlots);
					restFound = true;
				}
			return {
				type: Syntax.PartialApplicationExpression,
				callee: callee,
				'arguments': args
			};
		},

		createCatchClause: function(param, body) {
			return {
				type: Syntax.CatchClause,
				param: param,
				body: body
			};
		},

		createConditionalExpression: function(test, consequent, alternate) {
			return {
				type: Syntax.ConditionalExpression,
				test: test,
				consequent: consequent,
				alternate: alternate
			};
		},

		createContinueStatement: function(label) {
			return {
				type: Syntax.ContinueStatement,
				label: label
			};
		},

		createDebuggerStatement: function() {
			return {
				type: Syntax.DebuggerStatement
			};
		},

		createDoWhileStatement: function(body, test) {
			return {
				type: Syntax.DoWhileStatement,
				body: body,
				test: test
			};
		},

		createEmptyStatement: function() {
			return {
				type: Syntax.EmptyStatement
			};
		},

		createExpressionStatement: function(expression) {
			return {
				type: Syntax.ExpressionStatement,
				expression: expression
			};
		},

		createStatementExpression: function(statement) {
			return {
				type: Syntax.StatementExpression,
				statement: statement
			};
		},

		createForStatement: function(init, test, update, body) {
			return {
				type: Syntax.ForStatement,
				init: init,
				test: test,
				update: update,
				body: body
			};
		},

		createForOfStatement: function(left, right, body) {
			return {
				type: Syntax.ForOfStatement,
				left: left,
				right: right,
				body: body,
			};
		},

		createFunctionDeclaration: function(
			id, params, defaults, coercives, body, rest, generator, async,
			lexicalThis, expression, arity
		) {
			return {
				type: Syntax.FunctionDeclaration,
				id: id,
				params: params,
				defaults: defaults,
				coercives: coercives,
				body: body,
				rest: rest,
				generator: generator,
				async: async,
				lexicalThis: lexicalThis,
				expression: expression,
				arity: arity
			};
		},

		createFunctionExpression: function(
			id, params, defaults, coercives, body, rest, generator, async,
			lexicalThis, expression, arity
		) {
			return {
				type: Syntax.FunctionExpression,
				id: id,
				params: params,
				defaults: defaults,
				coercives: coercives,
				expression: expression,
				body: body,
				rest: rest,
				generator: generator,
				async: async,
				lexicalThis: lexicalThis,
				arity: arity
			};
		},

		createIdentifier: function(name) {
			return {
				type: Syntax.Identifier,
				name: name
			};
		},

		createCoercive: function(id, nilable) {
			return {
				type: Syntax.Coercive,
				id: id,
				nilable: nilable
			};
		},

		createIfStatement: function(test, consequent, alternate) {
			return {
				type: Syntax.IfStatement,
				test: test,
				consequent: consequent,
				alternate: alternate
			};
		},

		createLabeledStatement: function(label, body) {
			return {
				type: Syntax.LabeledStatement,
				label: label,
				body: body
			};
		},

		createLiteral: function(kind, value, raw) {
			return {
				type: Syntax.Literal,
				kind: kind,
				value: value,
				raw: raw
			};
		},

		createMemberExpression: function(computed, own, object, property) {
			return {
				type: Syntax.MemberExpression,
				computed: computed,
				own: own,
				object: object,
				property: property
			};
		},

		createNewExpression: function(prototype, args) {
			return {
				type: Syntax.NewExpression,
				prototype: prototype,
				'arguments': args
			};
		},

		createObjectExpression: function(properties) {
			return {
				type: Syntax.ObjectExpression,
				properties: properties
			};
		},

		createPostfixExpression: function(operator, argument) {
			return {
				type: Syntax.UpdateExpression,
				operator: operator,
				argument: argument,
				prefix: false
			};
		},

		createProgram: function(body) {
			return {
				type: Syntax.Program,
				body: body
			};
		},

		createProperty: function(
			kind, key, value, method, shorthand, isStatic, isConst,
			isConditional, coercive
		) {
			// coercive is used for destructuring, but shouldn't be used for a
			// real object literal.
			return {
				type: Syntax.Property,
				key: key,
				value: value,
				kind: kind,
				method: method,
				shorthand: shorthand,
				coercive: coercive,
				static: isStatic,
				const: isConst,
				conditional: isConditional
			};
		},

		createReturnStatement: function(argument) {
			return {
				type: Syntax.ReturnStatement,
				argument: argument
			};
		},

		createSequenceExpression: function(expressions) {
			if (!expressions || !('length' in expressions))
				throw new Error('Array expected');
			if (expressions.length == 0)
				throw new Error('Sequence expression must contain at least one expression');
			return {
				type: Syntax.SequenceExpression,
				expressions: expressions
			};
		},

		createSwitchCase: function(test, consequent) {
			return {
				type: Syntax.SwitchCase,
				test: test,
				consequent: consequent
			};
		},

		createSwitchStatement: function(discriminant, cases) {
			return {
				type: Syntax.SwitchStatement,
				discriminant: discriminant,
				cases: cases
			};
		},

		createThisExpression: function() {
			return {
				type: Syntax.ThisExpression
			};
		},

		createThrowStatement: function(argument) {
			return {
				type: Syntax.ThrowStatement,
				argument: argument
			};
		},

		createTryStatement: function(
			block, guardedHandlers, handlers, finalizer
		) {
			return {
				type: Syntax.TryStatement,
				block: block,
				guardedHandlers: guardedHandlers,
				handlers: handlers,
				finalizer: finalizer
			};
		},

		createUnaryExpression: function(operator, argument) {
			if (operator === '++' || operator === '--') {
				return {
					type: Syntax.UpdateExpression,
					operator: operator,
					argument: argument,
					prefix: true
				};
			}
			return {
				type: Syntax.UnaryExpression,
				operator: operator,
				argument: argument
			};
		},

		createVariableDeclaration: function(declarations, kind) {
			return {
				type: Syntax.VariableDeclaration,
				declarations: declarations,
				kind: kind
			};
		},

		createVariableDeclarator: function(id, init, coercive) {
			return {
				type: Syntax.VariableDeclarator,
				id: id,
				init: init,
				coercive: coercive
			};
		},

		createSymbolDeclaration: function(declarations) {
			return {
				type: Syntax.SymbolDeclaration,
				declarations: declarations
			};
		},

		createSymbolDeclarator: function(id) {
			return {
				type: Syntax.SymbolDeclarator,
				id: id
			};
		},

		createSlotExpression: function(arg, rest) {
			return {
				type: Syntax.SlotExpression,
				argument: arg,
				rest: rest
			};
		},

		createWhileStatement: function(test, body) {
			return {
				type: Syntax.WhileStatement,
				test: test,
				body: body
			};
		},

		createTemplateElement: function(value, tail) {
			return {
				type: Syntax.TemplateElement,
				value: value,
				tail: tail
			};
		},

		createTemplateLiteral: function(quasis, expressions) {
			return {
				type: Syntax.TemplateLiteral,
				quasis: quasis,
				expressions: expressions
			};
		},

		createSpreadElement: function(argument) {
			return {
				type: Syntax.SpreadElement,
				argument: argument
			};
		},

		createTaggedTemplateExpression: function(tag, quasi) {
			return {
				type: Syntax.TaggedTemplateExpression,
				tag: tag,
				quasi: quasi
			};
		},

		createExportSpecifier: function(id, name) {
			return {
				type: Syntax.ExportSpecifier,
				id: id,
				name: name
			};
		},

		createExportBatchSpecifier: function() {
			return {
				type: Syntax.ExportBatchSpecifier
			};
		},

		createExportDeclaration: function(declaration, specifiers, source) {
			return {
				type: Syntax.ExportDeclaration,
				declaration: declaration,
				specifiers: specifiers,
				source: source
			};
		},

		createImportSpecifier: function(id, name) {
			return {
				type: Syntax.ImportSpecifier,
				id: id,
				name: name
			};
		},

		createImportDeclaration: function(specifiers, kind, source) {
			return {
				type: Syntax.ImportDeclaration,
				specifiers: specifiers,
				kind: kind,
				source: source
			};
		},

		createYieldExpression: function(argument, delegate) {
			return {
				type: Syntax.YieldExpression,
				argument: argument,
				delegate: delegate
			};
		},

		createModuleDeclaration: function(id, source, body) {
			return {
				type: Syntax.ModuleDeclaration,
				id: id,
				source: source,
				body: body
			};
		},

		createCascadeStatement: function(object, block) {
			return {
				type: Syntax.CascadeStatement,
				object: object,
				block: block
			};
		},

		createCascadeContext: function() {
			return {
				type: Syntax.CascadeContext
			};
		},

		createComprehensionExpression: function(kind, body) {
			return {
				type: Syntax.ComprehensionExpression,
				kind: kind,
				body: body
			};
		}

	};

	// Throw an exception

	function throwError(token, messageFormat) {

		var error, args, msg;

		args = Array.prototype.slice.call(arguments, 2);
		msg = messageFormat.replace(/%(\d)/g, function(whole, index) {
			assert(index < args.length,
				'Message reference must be in range'
			);
			return args[index];
		});

		if (typeof token.lineNumber === 'number') {
			error = new Error('Line ' + token.lineNumber + ': ' + msg);
			error.index = token.range[0];
			error.lineNumber = token.lineNumber;
			error.column = token.range[0] - lineStart + 1;
		}
		else {
			error = new Error('Line ' + lineNumber + ': ' + msg);
			error.index = index;
			error.lineNumber = lineNumber;
			error.column = index - lineStart + 1;
		}

		error.description = msg;

		throw error;

	}

	function throwErrorTolerant() {
		try {
			throwError.apply(null, arguments);
		}
		catch (e) {
			if (extra.errors)
				extra.errors.push(e);
			else
				throw e;
		}
	}


	// Throw an exception because of the token.

	function throwUnexpected(token, expected) {

		if (expected === undefined)
			expected = '';
		else
			expected = ', expected ' + expected;
		if (token.type === Token.EOF)
			throwError(token, Messages.UnexpectedEOS + expected);

		if (token.type === Token.NumericLiteral)
			throwError(token, Messages.UnexpectedNumber + expected);

		if (token.type === Token.StringLiteral)
			throwError(token, Messages.UnexpectedString + expected);

		if (token.type === Token.Identifier)
			throwError(token, Messages.UnexpectedIdentifier + expected);

		if (token.type === Token.Keyword) {
			if (isFutureReservedWord(token.value))
				throwError(token, Messages.UnexpectedReserved + expected);
			throwError(
				token, Messages.UnexpectedToken + expected, token.value
			);
		}

		if (token.type === Token.Template)
			throwError(
				token, Messages.UnexpectedTemplate + expected, token.value.raw
			);

		if (token.type === Token.SymbolLiteral)
			throwError(token, Messages.UnexpectedSymbol + expected);

		// BooleanLiteral, NilLiteral, or Punctuator.
		throwError(token, Messages.UnexpectedToken + expected, token.value);

	}

	// Expect the next token to match the specified punctuator.
	// If not, an exception will be thrown.

	function expect(value) {
		var token = lex();
		if (token.type !== Token.Punctuator || token.value !== value)
			throwUnexpected(token, value);
	}

	// Expect the next token to match the specified keyword.
	// If not, an exception will be thrown.

	function expectKeyword(keyword) {
		var token = lex();
		if (token.type !== Token.Keyword || token.value !== keyword)
			throwUnexpected(token, keyword);
	}

	// Return true if the next token matches the specified punctuator.

	function match(value) {
		return lookahead.type === Token.Punctuator
			&& lookahead.value === value;
	}

	// Return true if the next token matches the specified keyword

	function matchKeyword(keyword) {
		return lookahead.type === Token.Keyword
			&& lookahead.value === keyword;
	}


	// Return true if the next token matches the specified contextual keyword

	function matchContextualKeyword(keyword) {
		return lookahead.type === Token.Identifier
			&& lookahead.value === keyword;
	}

	// Return true if the next token is an assignment operator

	function matchAssign() {

		var op;

		if (lookahead.type !== Token.Punctuator)
			return false;

		op = lookahead.value;

		return op === '='  || op === '*=' || op === '/='
			|| op === '+=' || op === '-=' || op === '^='
			|| op === ':=' || op === '&='
			|| op === '&&=' || op === '||=' || op === '??='
			|| op === 'and=' || op === 'or=' || op === 'xor=';

	}

	function consumeSemicolon() {

		var line;

		// Catch the very common case first: immediately a semicolon (char #59)
		if (source.charCodeAt(index) === 59) {
			lex();
			return;
		}

		skipComment();

		expect(';');

	}

	// Return true if provided expression is LeftHandSideExpression

	function isLeftHandSide(expr) {
		return expr.type === Syntax.Identifier
			|| expr.type === Syntax.MemberExpression;
	}

	function isAssignableLeftHandSide(expr) {
		return isLeftHandSide(expr)
			|| expr.type === Syntax.ObjectPattern
			|| expr.type === Syntax.ArrayPattern;
	}

	// 11.1.4 Array Initialiser

	function parseArrayInitialiser() {

		var elements, tmp, body;

		elements = [ ];

		expect('[');
		while (!match(']')) {
			if (lookahead.value === ','
			&& lookahead.type === Token.Punctuator) {
				lex();
				elements.push(null);
				if (match(']')) {
					elements.push(null);
				}
			}
			else {
				tmp = parseSpreadOrAssignmentExpression();
				elements.push(tmp);
				if (match('|')) {
					lex();
					tmp.coercive = parseCoercive();
				}
				if (!(match(']')
				|| matchKeyword('for')
				|| matchKeyword('if'))) {
					expect(','); // this lexes.
					if (match(']')) {
						elements.push(null);
					}
				}
			}
		}

		expect(']');

		return delegate.createArrayExpression(elements);

	}

	function parseComprehensionExpression() {

		var body, kind, closer, previousEachAllowed, previousYieldAllowed;

		if (match('[:')) {
			kind = 'array';
			closer = ']';
		}
		else if (match('(:')) {
			kind = 'generator';
			closer = ')';
		}
		// TODO:
		// else if (match('{:')) {
		// 	kind = 'async';
		//	closer = '}';
		// }
		else
			throwUnexpected(lookahead);
		lex();

		if (kind == 'array') {
			previousEachAllowed = state.eachAllowed;
			state.eachAllowed = true;
		}
		else if (kind == 'generator') {
			previousYieldAllowed = state.yieldAllowed;
			state.yieldAllowed = true;
		}
		body = parseStatementList(closer);
		if (kind == 'array')
			state.eachAllowed = previousEachAllowed;
		else if (kind == 'generator')
			state.yieldAllowed = previousYieldAllowed;

		expect(closer);

		return delegate.createComprehensionExpression(kind, body);

	}

	// 11.1.5 Object Initialiser

	function parsePropertyFunction(options) {

		var previousYieldAllowed, previousAwaitAllowed, params, defaults,
			coercives, body, lexicalThis, expression;

		previousYieldAllowed = state.yieldAllowed;
		state.yieldAllowed = options.generator;
		previousAwaitAllowed = state.awaitAllowed;
		state.awaitAllowed = options.async;
		params = options.params || [ ];
		defaults = options.defaults || [ ];
		coercives = options.coercives || [ ];
		lexicalThis = match('::{') || match('::');
		expression = match(':') || match('::');

		if (match(':{') || match('::{') || match(':') || match('::'))
			lex();
		else
			throwUnexpected(lookahead);

		if (expression)
			body = parseAssignmentExpression();
		else
			body = parseFunctionSourceElements();
		state.yieldAllowed = previousYieldAllowed;
		state.awaitAllowed = previousAwaitAllowed;

		return delegate.createFunctionExpression(
			null, params, defaults, coercives, body, options.rest || null,
			options.generator, options.async, lexicalThis, expression, null
		);

	}

	function parseObjectPropertyKey() {

		var token = lex();

		if (token.type === Token.EOF || token.type === Token.Punctuator) {
			throwUnexpected(token);
		}

		if (token.type === Token.StringLiteral
		|| token.type === Token.NumericLiteral
		|| token.type === Token.SymbolLiteral)
			return delegate.createLiteral(
				TokenName[token.type], token.value,
				source.slice(token.range[0], token.range[1])
			);

		return delegate.createIdentifier(token.value);

	}

	function parseObjectProperty() {

		var token, key, id, value, param, expr, coercive, isStatic, isConst,
			isConditional;

		token = lookahead;

		coercive = null;
		isStatic = false;
		isConst = false;
		isConditional = false;

		if (token.type === Token.Keyword && token.value === 'static'
		&& !(match(':') || match('::') || match('('))) {
			isStatic = true;
			lex();
			token = lookahead;
		}

		if (token.type === Token.Keyword && token.value === 'const'
		&& !(match(':') || match('::') || match('('))) {
			isConst = true;
			lex();
			token = lookahead;
		}

		if (token.type === Token.Punctuator && token.value === '?') {
			isConditional = true;
			lex();
			token = lookahead;
		}

		if (token.type === Token.Identifier) {

			id = parseObjectPropertyKey();

			// Property Assignment: Getter and Setter.

			if (token.value === 'get'
			&& !(match(':') || match('::') || match('('))) {
				key = parseObjectPropertyKey();
				if (match('(')) {
					expect('(');
					expect(')');
				}
				return delegate.createProperty(
					'get', key,
					parsePropertyFunction({ generator: false, async: false }),
					false, false, isStatic, isConst, isConditional, null
				);
			}
			if (token.value === 'set'
			&& !(match(':') || match('::') || match('('))) {
				key = parseObjectPropertyKey();
				expect('(');
				token = lookahead;
				param = [ parseVariableIdentifier() ];
				expect(')');
				return delegate.createProperty(
					'set', key,
					parsePropertyFunction({
						params: param,
						generator: false,
						async: false,
						name: token
					}),
					false, false, isStatic, isConst, isConditional, null
				);
			}
			if (match(':') || match('::')) {
				if (match('::'))
					lexSplit(1);
				else
					lex();
				expr = parseAssignmentExpression();
				if (match('|')) {
					lex();
					coercive = parseCoercive();
				}
				return delegate.createProperty(
					'init', id, expr, false, false, isStatic, isConst,
					isConditional, coercive
				);
			}
			if (match('|')) {
				lex();
				coercive = parseCoercive();
			}
			return delegate.createProperty(
				'init', id, id, false, true, isStatic, isConst, isConditional,
				coercive
			);
		}
		key = parseObjectPropertyKey();
		// TODO: I'm not sure what this codepath is for or if it should
		// understand coercives, but I'm adding coercive recognition for now...
		// Note: looks like it has to do with processing property names that
		// aren't parsed as identifiers, like
		//     var o = { throw: 1 };
		if (match(':') || match('::')) {
			if (match('::'))
				lexSplit(1);
			else
				lex();
			if (match('|')) {
				lex();
				coercive = parseCoercive();
			}
			return delegate.createProperty(
				'init', key, parseAssignmentExpression(), false, false,
				isStatic, isConst, isConditional, coercive
			);
		}

		throwUnexpected(lex());

	}

	function parseObjectInitialiser() {

		var properties = [ ], property, name, key, kind, map = { };

		expect('{');

		while (!match('}')) {
			property = parseObjectProperty();

			if (property.key.type === Syntax.Identifier)
				name = property.key.name;
			else
				name = String(property.key.value);

			if (property.kind === 'init')
				kind = PropertyKind.Data;
			else if(property.kind === 'get')
				kind = PropertyKind.Get;
			else
				kind = PropertyKind.Set;

			key = '$' + name;
			if (hasOwn(map, key)) {
				if (map[key] === PropertyKind.Data) {
					if (kind === PropertyKind.Data)
						throwErrorTolerant({ }, Messages.DuplicateProperty);
					else
						throwErrorTolerant({ }, Messages.AccessorDataProperty);
				}
				else {
					if (kind === PropertyKind.Data)
						throwErrorTolerant({ }, Messages.AccessorDataProperty);
					else if (map[key] & kind)
						throwErrorTolerant({ }, Messages.AccessorGetSet);
				}
				map[key] |= kind;
			}
			else
				map[key] = kind;

			properties.push(property);

			if (!match('}')) {
				expect(',');
				if (match('}')) {
					throwUnexpected(lex());
				}
			}
		}

		expect('}');

		return delegate.createObjectExpression(properties);

	}

	function parseTemplateElement(option) {
		var token = scanTemplateElement(option);
		return delegate.createTemplateElement(
			{
				raw: token.value.raw,
				cooked: token.value.cooked
			},
			token.tail
		);
	}

	function parseTemplateLiteral() {

		var quasi, quasis, expressions;

		quasi = parseTemplateElement({ head: true });
		quasis = [ quasi ];
		expressions = [ ];

		while (!quasi.tail) {
			expressions.push(parseExpression());
			quasi = parseTemplateElement({ head: false });
			quasis.push(quasi);
		}

		return delegate.createTemplateLiteral(quasis, expressions);

	}

	// 11.1.6 The Grouping Operator

	function parseGroupExpression() {

		var expr;

		expect('(');

		++state.parenthesizedCount;

		expr = parseExpression();

		expect(')');

		return expr;

	}


	// 11.1 Primary Expressions

	function parsePrimaryExpression() {

		var type, token;

		token = lookahead;
		type = lookahead.type;

		if (type === Token.Identifier) {
			lex();
			return delegate.createIdentifier(token.value);
		}

		if (type === Token.StringLiteral
		|| type === Token.NumericLiteral
		|| type === Token.SymbolLiteral) {
			token = lex();
			return delegate.createLiteral(
				TokenName[token.type],
				token.value,
				source.slice(token.range[0], token.range[1])
			);
		}

		if (type === Token.Keyword) {

			if (matchKeyword('this')) {
				lex();
				return delegate.createThisExpression();
			}

			if (matchKeyword('fn'))
				return parseFunctionExpression('fn');
			if (matchKeyword('gen'))
				return parseFunctionExpression('gen');
			if (matchKeyword('async'))
				return parseFunctionExpression('async');

			if (matchKeyword('super')) {
				lex();
				return delegate.createIdentifier('super');
			}

		}

		if (type === Token.BooleanLiteral) {
			token = lex();
			token.value = (token.value === 'true');
			return delegate.createLiteral(
				TokenName[token.type],
				token.value,
				source.slice(token.range[0], token.range[1])
			);
		}

		if (type === Token.NilLiteral) {
			token = lex();
			token.value = null;
			return delegate.createLiteral(
				TokenName[token.type],
				token.value,
				source.slice(token.range[0], token.range[1])
			);
		}

		if (match('['))
			return parseArrayInitialiser();

		if (match('[:') || match('(:'))
			return parseComprehensionExpression();

		if (match('{'))
			return parseObjectInitialiser();

		if (match('('))
			return parseGroupExpression();

		if (match('/') || match('/=')) {
			token = scanRegExp();
			return delegate.createLiteral(
				TokenName[token.type],
				token.value,
				source.slice(token.range[0], token.range[1])
			);
		}

		if (match('<'))
			return parseSlotExpression();

		if (type === Token.Template)
			return parseTemplateLiteral();

		if (match('.') && state.inCascadeCount > 0)
			return delegate.createCascadeContext();

		return parseStatement(true);

	}

	// 11.2 Left-Hand-Side Expressions

	function parseArguments(partial) {

		var args = [ ], arg;

		expect(partial ? ':(' : '(');

		if (!match(')')) {
			while (index < length) {
				arg = parseSpreadOrAssignmentExpression();
				args.push(arg);

				if (match(')')) {
					break;
				}

				expect(',');
			}
		}

		expect(')');

		return args;

	}

	function parseSpreadOrAssignmentExpression() {
		if (match('...')) {
			lex();
			return delegate.createSpreadElement(parseAssignmentExpression());
		}
		return parseAssignmentExpression();
	}

	function parseNonComputedProperty() {

		var token;

		token = lex();

		if (isIdentifierName(token))
			return delegate.createIdentifier(token.value);
		else if (token.type === Token.SymbolLiteral)
			return delegate.createLiteral(
				TokenName[token.type],
				token.value,
				source.slice(token.range[0], token.range[1])
			);
		else
			throwUnexpected(token);

	}

	function parseNonComputedMember(own) {

		if (own)
			expect('#');
		else
			expect('.');

		return parseNonComputedProperty();

	}

	function parseComputedMember(own) {

		var expr;

		if (own)
			expect('#[');
		else
			expect('[');

		expr = parseExpression();

		expect(']');

		return expr;

	}

	function parseNewExpression() {

		var callee, args;

		expectKeyword('new');
		callee = parseLeftHandSideExpression();
		args = parseArguments();

		return delegate.createNewExpression(callee, args);

	}

	function parseBoundMember() {
		expect('::');
		return parseLeftHandSideExpression();
	}

	function parseCascadeStatement() {

		var object, block;

		expectKeyword('with');
		object = parseExpression();

		++state.inCascadeCount;
		block = parseBlock();
		--state.inCascadeCount;

		return delegate.createCascadeStatement(object, block);

	}

	function parseLeftHandSideExpression(allowCall) {

		var expr, args, property;

		expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

		do {
			if (allowCall && match('(')) {
				args = parseArguments();
				expr = delegate.createCallExpression(expr, args);
			}
			else if (match('['))
				expr = delegate.createMemberExpression(
					true, false, expr, parseComputedMember()
				);
			else if (match('.'))
				expr = delegate.createMemberExpression(
					false, false, expr, parseNonComputedMember()
				);
			else if (match('::'))
				expr = delegate.createBinaryExpression(
					'::', expr, parseBoundMember()
				);
			else if (match('#['))
				expr = delegate.createMemberExpression(
					true, true, expr, parseComputedMember(true)
				);
			else if (match('#'))
				expr = delegate.createMemberExpression(
					false, true, expr, parseNonComputedMember(true)
				);
			else if (match(':(')) {
				args = parseArguments(true);
				expr = delegate.createPartialApplicationExpression(
					expr, args
				);
			}
			else if (lookahead.type === Token.Template)
				expr = delegate.createTaggedTemplateExpression(
					expr, parseTemplateLiteral()
				);
			else
				break;
		} while (true);

		return expr;

	}


	// 11.3 Postfix Expressions

	function parsePostfixExpression() {

		var expr = parseLeftHandSideExpression(true),
			token = lookahead;

		if (lookahead.type !== Token.Punctuator)
			return expr;

		if (match('++') || match('--')) {
			// 11.3.1, 11.3.2
			if (!isLeftHandSide(expr))
				throwError({ }, Messages.InvalidLHSInAssignment);
			token = lex();
			expr = delegate.createPostfixExpression(token.value, expr);
		}

		return expr;

	}

	// 11.4 Unary Operators
	function parseUnaryExpression() {

		var token, expr, isEach;

		if (lookahead.type !== Token.Punctuator
		&& lookahead.type !== Token.Keyword)
			return parsePostfixExpression();

		if (match('++') || match('--')) {
			token = lex();
			expr = parseUnaryExpression();
			// 11.4.4, 11.4.5

			if (!isLeftHandSide(expr)) {
				throwError({ }, Messages.InvalidLHSInAssignment);
			}

			return delegate.createUnaryExpression(token.value, expr);
		}

		if (match('+') || match('-') || match('!') || match('#') || match('::')
		|| match('&') || match('#[')) {
			// This should really be interpreted as two tokens: # and [
			if (match('#['))
				token = lexSplit(1);
			else
				token = lex();
			expr = parseUnaryExpression();
			return delegate.createUnaryExpression(token.value, expr);
		}

		if (matchKeyword('delete') || matchKeyword('void')
		|| matchKeyword('typeof') || matchKeyword('like')
		|| matchKeyword('not')
		|| state.awaitAllowed && matchKeyword('await')
		|| state.eachAllowed && matchKeyword('each')) {
			isEach = matchKeyword('each');
			token = lex();
			if (isEach)
				expr = parseAssignmentExpression();
			else
				expr = parseUnaryExpression();
			expr = delegate.createUnaryExpression(token.value, expr);
			if (expr.operator === 'delete'
			&& expr.argument.type === Syntax.Identifier)
				throwErrorTolerant({ }, Messages.Delete);
			return expr;
		}

		return parsePostfixExpression();

	}

	function binaryPrecedence(token) {

		var prec = 0;

		if (token.type !== Token.Punctuator && token.type !== Token.Keyword)
			return 0;

		switch (token.value) {

		case '..':
		case '...':
		case 'by':
			prec = 1;
			break;

		case '??':
			prec = 2;
			break;

		case '||':
			prec = 3;
			break;

		case '&&':
			prec = 4;
			break;

		case 'or':
			prec = 5;
			break;

		case 'xor':
			prec = 6;
			break;

		case 'and':
			prec = 7;
			break;

		case '~=':
		case '!~=':
		case '==':
		case '!=':
		case 'is':
		case '!is':
			prec = 8;
			break;

		case '<':
		case '>':
		case '<=':
		case '>=':
		case 'like':
		case '!like':
			prec = 9;
			break;

		case 'in':
		case '!in':
			prec = 10;
			break;

		case 'lsh':
		case 'rsh':
		case 'ursh':
			prec = 11;
			break;

		case '+':
		case '-':
		case '&':
			prec = 12;
			break;

		case '*':
		case '/':
		case 'mod':
			prec = 13;
			break;

		case '^':
			prec = 14;
			break;

		default:
			break;
		}

		return prec;

	}

	// 11.5 Multiplicative Operators
	// 11.6 Additive Operators
	// 11.7 Bitwise Shift Operators
	// 11.8 Relational Operators
	// 11.9 Equality Operators
	// 11.10 Binary Bitwise Operators
	// 11.11 Binary Logical Operators

	function parseBinaryExpression() {

		var expr, token, prec, stack, right, operator, left, i;

		expr = parseUnaryExpression();

		token = lookahead;
		prec = binaryPrecedence(token);
		if (prec === 0)
			return expr;
		token.prec = prec;
		lex();

		stack = [ expr, token, parseUnaryExpression() ];

		while ((prec = binaryPrecedence(lookahead)) > 0) {

			// Reduce: make a binary expression from the three topmost entries.
			while (stack.length > 2 && prec <= stack[stack.length - 2].prec) {
				right = stack.pop();
				operator = stack.pop().value;
				left = stack.pop();
				stack.push(
					delegate.createBinaryExpression(operator, left, right)
				);
			}

			// Shift.
			token = lex();
			token.prec = prec;
			stack.push(token);
			stack.push(parseUnaryExpression());
		}

		// Final reduce to clean-up the stack.
		i = stack.length - 1;
		expr = stack[i];
		while (i > 1) {
			expr = delegate.createBinaryExpression(
				stack[i - 1].value, stack[i - 2], expr
			);
			i -= 2;
		}

		return expr;

	}


	// 11.12 Conditional Operator

	function parseConditionalExpression() {

		var expr, consequent, alternate;

		expr = parseBinaryExpression();

		if (match('?')) {

			lex();
			consequent = parseAssignmentExpression();
			expect(':');
			alternate = parseAssignmentExpression();

			expr = delegate.createConditionalExpression(
				expr, consequent, alternate
			);

		}

		return expr;

	}

	// 11.13 Assignment Operators

	function reinterpretAsAssignmentBindingPattern(expr) {

		var i, len, property, element;

		if (expr.type === Syntax.ObjectExpression) {
			expr.type = Syntax.ObjectPattern;
			for (i = 0, len = expr.properties.length; i < len; i += 1) {
				property = expr.properties[i];
				if (property.kind !== 'init')
					throwError({ }, Messages.InvalidLHSInAssignment);
				reinterpretAsAssignmentBindingPattern(property.value);
			}
		}
		else if (expr.type === Syntax.ArrayExpression) {
			expr.type = Syntax.ArrayPattern;
			for (i = 0, len = expr.elements.length; i < len; i += 1) {
				element = expr.elements[i];
				if (element)
					reinterpretAsAssignmentBindingPattern(element);
			}
		}
		else if (expr.type === Syntax.SpreadElement) {
			reinterpretAsAssignmentBindingPattern(expr.argument);
			if (expr.argument.type === Syntax.ObjectPattern)
				throwError({ }, Messages.ObjectPatternAsSpread);
		}
		else {
			// TODO: I've put PartialApplicationExpression here for now, but
			// I'm not 100% sure what this is for.  My current guess is that
			// it's for something like the following situation:
			//     var { a.b:(1): c } = d;
			// ... which, if I understand correctly, should be the same as:
			//     var c = d.a.b:(1);
			// This seems like it should be allowed, but the algorithm actually
			// looks a little weird to me.  For instance, in the
			// ObjectExpression conditional block above, why is this function
			// recursively called on `property.value`? Should it be called on
			// the LHS instead?  I feel that I might not have a good
			// understanding of what's really going on.
			if (expr.type !== Syntax.MemberExpression
			&& expr.type !== Syntax.CallExpression
			&& expr.type !== Syntax.NewExpression
			&& expr.type !== Syntax.PartialApplicationExpression
			&& expr.type !== Syntax.Identifier)
				throwError({ }, Messages.InvalidLHSInAssignment);
		}

	}


	function reinterpretAsDestructuredParameter(options, expr) {

		var i, len, property, element;

		switch (expr.type) {
		case Syntax.ObjectExpression:
			expr.type = Syntax.ObjectPattern;
			for (i = 0, len = expr.properties.length; i < len; i += 1) {
				property = expr.properties[i];
				if (property.kind !== 'init')
					throwError({ }, Messages.InvalidLHSInFormalsList);
				if (property.static)
					throwError({ }, Messages.InvalidLHSInFormalsList);
				reinterpretAsDestructuredParameter(options, property.value);
			}
			break;
		case Syntax.ArrayExpression:
			expr.type = Syntax.ArrayPattern;
			for (i = 0, len = expr.elements.length; i < len; i += 1) {
				element = expr.elements[i];
				if (element)
					reinterpretAsDestructuredParameter(options, element);
			}
		case Syntax.Identifier:
			validateParam(options, expr, expr.name);
			break;
		default:
			if (expr.type !== Syntax.MemberExpression)
				throwError({ }, Messages.InvalidLHSInFormalsList);
		}

	}

	function parseAssignmentExpression() {

		var expr, token, params, oldParenthesizedCount;

		if (matchKeyword('yield')) {
			return parseYieldExpression();
		}

		oldParenthesizedCount = state.parenthesizedCount;

		token = lookahead;
		expr = parseConditionalExpression();

		if (matchAssign()) {
			// 11.13.1
			// ES.next draf 11.13 Runtime Semantics step 1
			if (match('=')
			&& (
				expr.type === Syntax.ObjectExpression
				|| expr.type === Syntax.ArrayExpression
			))
				reinterpretAsAssignmentBindingPattern(expr);
			else if (!match(':=') && !isLeftHandSide(expr))
				throwError({ }, Messages.InvalidLHSInAssignment);

			expr = delegate.createAssignmentExpression(
				lex().value, expr, parseAssignmentExpression()
			);
		}

		return expr;

	}

	// 11.14 Comma Operator

	function parseExpression() {

		var expr, expressions, sequence, spreadFound, l2;

		expr = parseAssignmentExpression();
		expressions = [ expr ];

		if (match(',')) {
			while (index < length) {
				if (!match(',')) {
					break;
				}

				lex();
				expr = parseSpreadOrAssignmentExpression();
				expressions.push(expr);

				if (expr.type === Syntax.SpreadElement) {
					spreadFound = true;
					break;
				}
			}

			sequence = delegate.createSequenceExpression(expressions);
		}

		if (spreadFound) {
			l2 = lookahead2();
			if (l2.value !== ':{' && l2.value !== '::{') {
				throwError({ }, Messages.IllegalSpread);
			}
		}

		return sequence || expr;

	}

	// 12.1 Block

	function parseStatementList(closer) {

		if (closer === undefined)
			closer = '}';

		var list = [ ],
			statement;

		while (index < length) {
			if (match(closer))
				break;
			statement = parseSourceElement();
			if (typeof statement === 'undefined')
				break;
			list.push(statement);
		}

		return list;

	}

	function parseBlock() {

		var block, oldParsingAsExpression;

		expect(':{');

		oldParsingAsExpression = parsingAsExpression;
		parsingAsExpression = false;
		block = parseStatementList();
		parsingAsExpression = oldParsingAsExpression;

		expect('}');
		
		return delegate.createBlockStatement(block);

	}

	// 12.2 Variable Statement

	function parseVariableIdentifier() {

		var token = lex();

		if (token.type !== Token.Identifier)
			throwUnexpected(token);

		return delegate.createIdentifier(token.value);

	}

	function parseCoercive() {
		var id, nilable = false;
		id = parseVariableIdentifier();
		if (match('?')) {
			lex();
			nilable = true;
		}
		return delegate.createCoercive(id, nilable);
	}

	function parseSymbolLiteral() {
		var token = lex();
		if (token.type !== Token.SymbolLiteral) {
			throwUnexpected(token);
		}
		return delegate.createLiteral(
			TokenName[token.type], token.value,
			source.slice(token.range[0], token.range[1])
		);
	}

	function parseSlotExpression() {
		var expr = null, rest = false;
		expect('<');
		if (match('...')) {
			rest = true;
			lex();
		}
		else if (!match('>')) {
			// Using parseUnaryExpression here because it needs to restrict it
			// to prevent it from trying to treat the closing `>` as a binary
			// expression operator. Note that doing it this way permits unary
			// expressions, member expressions, and call expressions but
			// doesn't allow binary expressions or assignment expressions...
			// That could be a little confusing to users. There may be a better
			// way to do this, but it's hard to come up with a good strategy.
			// If every expression type except binary with operator `>` was
			// allowed, it'd be weird that operator `<` was allowed... It's
			// hard to come up with a better solution.
			expr = parseUnaryExpression();
		}
		expect('>');
		return delegate.createSlotExpression(expr, rest);
	}

	function parseVariableDeclaration(kind) {

		var id,
			init = null,
			coercive = null;

		assert(kind !== 'sym', 'Unexpected sym declaration');

		if (match('{')) {
			id = parseObjectInitialiser();
			reinterpretAsAssignmentBindingPattern(id);
		}
		else if (match('[')) {
			id = parseArrayInitialiser();
			reinterpretAsAssignmentBindingPattern(id);
		}
		else {
			id = state.allowKeyword
				? parseNonComputedProperty() : parseVariableIdentifier();
			// 12.2.1
		}

		if (kind === 'const') {
			if (!match('='))
				throwError({ }, Messages.NoUnintializedConst);
			expect('=');
			init = parseAssignmentExpression();
		}
		else {
			if (match('|')) {
				lex();
				coercive = parseCoercive();
			}
			if (match('=')) {
				lex();
				init = parseAssignmentExpression();
			}
		}

		return delegate.createVariableDeclarator(id, init, coercive);

	}

	function parseSymbolDeclaration() {
		var id = parseSymbolLiteral();
		return delegate.createSymbolDeclarator(id);
	}

	function parseDeclarationList(kind) {

		var list = [ ];

		do {
			if (kind === 'sym')
				list.push(parseSymbolDeclaration());
			else
				list.push(parseVariableDeclaration(kind));
			if (!match(','))
				break;
			lex();
		} while (index < length);

		return list;

	}

	// kind may be `var`, `sym`, or `const`
	function parseDeclaration(kind) {

		var declarations;

		expectKeyword(kind);

		declarations = parseDeclarationList(kind);

		consumeSemicolon();

		if (kind === 'sym')
			return delegate.createSymbolDeclaration(declarations);

		return delegate.createVariableDeclaration(declarations, kind);

	}

	// http://wiki.ecmascript.org/doku.php?id=harmony:modules

	function parseModuleDeclaration() {

		var id, src, body;

		lex();   // 'module'

		switch (lookahead.type) {

		case Token.StringLiteral:
			id = parsePrimaryExpression();
			body = parseModuleBlock();
			src = null;
			break;

		case Token.Identifier:
			id = parseVariableIdentifier();
			body = null;
			if (!matchContextualKeyword('from')) {
				throwUnexpected(lex());
			}
			lex();
			src = parsePrimaryExpression();
			if (src.type !== Syntax.Literal) {
				throwError({ }, Messages.InvalidModuleSpecifier);
			}
			break;
		}

		consumeSemicolon();

		return delegate.createModuleDeclaration(id, src, body);

	}

	function parseExportBatchSpecifier() {
		expect('*');
		return delegate.createExportBatchSpecifier();
	}

	function parseExportSpecifier() {
		var id, name = null;
		id = parseVariableIdentifier();
		if (matchContextualKeyword('as')) {
			lex();
			name = parseNonComputedProperty();
		}
		return delegate.createExportSpecifier(id, name);
	}

	function parseExportDeclaration() {

		var previousAllowKeyword, decl, def, src, specifiers;

		expectKeyword('export');

		// if (lookahead.type === Token.Keyword) {
		//     switch (lookahead.value) {
		//     case 'const':
		//     case 'var':
		//     case 'sym':
		//     case 'fn':
		//     case 'gen':
		//     case 'async':
		//         return delegate.createExportDeclaration(
		//				parseSourceElement(), null, null
		//			);
		//     }
		// }

		if (isIdentifierName(lookahead)) {
			previousAllowKeyword = state.allowKeyword;
			state.allowKeyword = true;
			decl = parseDeclarationList('var');
			state.allowKeyword = previousAllowKeyword;
			return delegate.createExportDeclaration(decl, null, null);
		}

		specifiers = [ ];
		src = null;

		if (match('*'))
			specifiers.push(parseExportBatchSpecifier());
		else {
			expect('{');
			do {
				specifiers.push(parseExportSpecifier());
			} while (match(',') && lex());
			expect('}');
		}

		if (matchContextualKeyword('from')) {
			lex();
			src = parsePrimaryExpression();
			if (src.type !== Syntax.Literal) {
				throwError({ }, Messages.InvalidModuleSpecifier);
			}
		}

		consumeSemicolon();

		return delegate.createExportDeclaration(null, specifiers, src);

	}

	function parseImportDeclaration() {

		var specifiers, kind, src;

		expectKeyword('import');
		specifiers = [ ];

		kind = 'unbound';
		if (isIdentifierName(lookahead)) {
			kind = 'default';
			specifiers.push(parseImportSpecifier());

			if (!matchContextualKeyword('from')) {
				throwError({ }, Messages.NoFromAfterImport);
			}
			lex();
		}
		else if (match('{')) {
			kind = 'named';
			lex();
			do {
				specifiers.push(parseImportSpecifier());
			} while (match(',') && lex());
			expect('}');

			if (!matchContextualKeyword('from')) {
				throwError({ }, Messages.NoFromAfterImport);
			}
			lex();
		}

		src = parsePrimaryExpression();
		if (src.type !== Syntax.Literal)
			throwError({ }, Messages.InvalidModuleSpecifier);

		consumeSemicolon();

		return delegate.createImportDeclaration(specifiers, kind, src);

	}

	function parseImportSpecifier() {

		var id, name = null;

		id = parseNonComputedProperty();
		if (matchContextualKeyword('as')) {
			lex();
			name = parseVariableIdentifier();
		}

		return delegate.createImportSpecifier(id, name);

	}

	// 12.3 Empty Statement

	function parseEmptyStatement() {
		expect(';');
		return delegate.createEmptyStatement();
	}

	// 12.12 Labelled Statements
	function parseLabeledStatement() {

		var expr, key, labeledBody;

		expect(':');
		expr = parseVariableIdentifier();

		if ((expr.type === Syntax.Identifier)) {
			key = '$' + expr.name;
			if (hasOwn(state.labelSet, key)) {
				throwError({ }, Messages.Redeclaration, 'Label', expr.name);
			}
			state.labelSet[key] = true;
			labeledBody = parseStatement();
			delete state.labelSet[key];
			return delegate.createLabeledStatement(expr, labeledBody);
		}

	}

	// 12.4 Expression Statement

	function parseExpressionStatement() {
		var expr = parseExpression();
		consumeSemicolon();
		return delegate.createExpressionStatement(expr);
	}

	// 12.5 If statement

	function parseIfStatement() {

		var test, consequent, alternate;

		expectKeyword('if');

		test = parseExpression();

		if (match(':'))
			lex();
		else if (!match(':{'))
			throwUnexpected(lookahead);

		consequent = parseStatement();

		if (matchKeyword('else')) {
			lex();
			if (match(':'))
				lex();
			else if (!match(':{') && !matchKeyword('if'))
				throwUnexpected(lookahead);
			alternate = parseStatement();
		}
		else
			alternate = null;

		return delegate.createIfStatement(test, consequent, alternate);

	}

	// 12.6 Iteration Statements

	function parseDoWhileStatement() {

		var body, test, oldInIteration;

		expectKeyword('do');

		oldInIteration = state.inIteration;
		state.inIteration = true;

		body = parseStatement();

		state.inIteration = oldInIteration;

		expectKeyword('while');

		test = parseExpression();

		expect(';');

		return delegate.createDoWhileStatement(body, test);

	}

	function parseWhileStatement() {

		var test, body, oldInIteration;

		expectKeyword('while');

		test = parseExpression();

		if (match(':'))
			lex();
		else if (!match(':{'))
			throwUnexpected(lookahead);

		oldInIteration = state.inIteration;
		state.inIteration = true;

		body = parseStatement();

		state.inIteration = oldInIteration;

		return delegate.createWhileStatement(test, body);

	}

	function parseForVariableDeclaration() {
		var token = lex(),
			declarations = parseDeclarationList();
		return delegate.createVariableDeclaration(declarations, token.value);
	}

	function parseForStatement(opts) {

		var init, test, update, left, right, body, operator, oldInIteration;
		init = test = update = null;
		expectKeyword('for');

		if (match(';'))
			lex();
		else {
			// sym is not allowed in the initializer of a for statement
			if (matchKeyword('var') || matchKeyword('const'))
				init = parseForVariableDeclaration();
			else {
				init = parseVariableIdentifier();
				if (matchKeyword('of')) {
					operator = lex();
					left = init;
					right = parseExpression();
					init = null;
				}
			}

			if (typeof left === 'undefined') {
				expect(';');
			}
		}

		if (typeof left === 'undefined') {

			if (!match(';')) {
				test = parseExpression();
			}
			expect(';');

			if (!match(':') && !match(':{')) {
				update = parseExpression();
			}
		}

		if (match(':'))
			lex();
		else if (!match(':{'))
			throwUnexpected(lookahead);

		oldInIteration = state.inIteration;
		state.inIteration = true;

		if (!(opts !== undefined && opts.ignore_body)) {
			body = parseStatement();
		}

		state.inIteration = oldInIteration;

		if (typeof left === 'undefined') {
			// TODO: Decide whether to support for statements or only for of
			// statements
			throwError({ }, 'Unsupported for statement');
			return delegate.createForStatement(init, test, update, body);
		}

		return delegate.createForOfStatement(left, right, body);

	}

	// 12.7 The continue statement

	function parseContinueStatement() {

		var label = null, key;

		expectKeyword('continue');

		// Optimize the most common form: 'continue;'.
		if (source.charCodeAt(index) === 59) {
			lex();

			if (!state.inIteration && !state.inSwitch) {
				throwError({ }, Messages.IllegalContinue);
			}

			return delegate.createContinueStatement(null);
		}

		if (lookahead.type === Token.Identifier) {
			label = parseVariableIdentifier();

			key = '$' + label.name;
			if (!hasOwn(state.labelSet, key)) {
				throwError({ }, Messages.UnknownLabel, label.name);
			}
		}

		consumeSemicolon();

		if (label === null && !state.inIteration) {
			throwError({ }, Messages.IllegalContinue);
		}

		return delegate.createContinueStatement(label);

	}

	// 12.8 The break statement

	function parseBreakStatement() {

		var label = null, key;

		expectKeyword('break');

		// Catch the very common case first: immediately a semicolon (char #59)
		if (source.charCodeAt(index) === 59) {
			lex();
			if (!(state.inIteration || state.inSwitch))
				throwError({ }, Messages.IllegalBreak);
			return delegate.createBreakStatement(null);
		}

		if (lookahead.type === Token.Identifier) {
			label = parseVariableIdentifier();
			key = '$' + label.name;
			if (!hasOwn(state.labelSet, key))
				throwError({ }, Messages.UnknownLabel, label.name);
		}

		consumeSemicolon();

		if (label === null && !(state.inIteration || state.inSwitch))
			throwError({ }, Messages.IllegalBreak);

		return delegate.createBreakStatement(label);

	}

	// 12.9 The return statement

	function parseReturnStatement() {

		var argument = null;

		expectKeyword('return');

		if (!state.inFunctionBody) {
			throwErrorTolerant({ }, Messages.IllegalReturn);
		}

		// 'return' followed by a space and an identifier is very common.
		if (source.charCodeAt(index) === 32) {
			if (isIdentifierStart(source.charCodeAt(index + 1))) {
				argument = parseExpression();
				consumeSemicolon();
				return delegate.createReturnStatement(argument);
			}
		}

		if (!match(';')) {
			if (!match('}') && lookahead.type !== Token.EOF) {
				argument = parseExpression();
			}
		}

		consumeSemicolon();

		return delegate.createReturnStatement(argument);

	}

	// 12.10 The switch statement

	function parseSwitchCase() {

		var test = [ ],
			consequent = [ ],
			sourceElement;

		if (matchKeyword('default')) {
			lex();
			test = null;
		}
		else {
			expectKeyword('case');
			do {
				test.push(parseSpreadOrAssignmentExpression());
			} while (match(',') && lex());
		}
		expect(':');

		while (index < length) {
			if (match('}') || matchKeyword('default') || matchKeyword('case'))
				break;
			sourceElement = parseSourceElement();
			if (typeof sourceElement === 'undefined')
				break;
			consequent.push(sourceElement);
		}

		return delegate.createSwitchCase(test, consequent);

	}

	function parseSwitchStatement() {

		var discriminant, cases, clause, oldInSwitch, defaultFound, oldParsingAsExpression;

		expectKeyword('switch');

		discriminant = parseExpression();

		// TODO: Is ':{' correct here?
		expect(':{');
		oldParsingAsExpression = parsingAsExpression;
		parsingAsExpression = false;

		cases = [ ];

		if (match('}')) {
			lex();
			return delegate.createSwitchStatement(discriminant, cases);
		}

		oldInSwitch = state.inSwitch;
		state.inSwitch = true;
		defaultFound = false;

		while (index < length) {
			if (match('}')) {
				break;
			}
			clause = parseSwitchCase();
			if (clause.test === null) {
				if (defaultFound) {
					throwError({ }, Messages.MultipleDefaultsInSwitch);
				}
				defaultFound = true;
			}
			cases.push(clause);
		}

		state.inSwitch = oldInSwitch;

		parsingAsExpression = oldParsingAsExpression;
		expect('}');

		return delegate.createSwitchStatement(discriminant, cases);

	}

	// 12.13 The throw statement

	function parseThrowStatement() {

		var argument;

		expectKeyword('throw');

		argument = parseExpression();

		consumeSemicolon();

		return delegate.createThrowStatement(argument);

	}

	// 12.14 The try statement

	function parseCatchClause() {

		var param, body;

		expectKeyword('catch');

		param = parseExpression();

		body = parseBlock();

		return delegate.createCatchClause(param, body);

	}

	function parseTryStatement() {

		var block, handlers = [ ], finalizer = null;

		expectKeyword('try');

		block = parseBlock();

		if (matchKeyword('catch')) {
			handlers.push(parseCatchClause());
		}

		if (matchKeyword('finally')) {
			lex();
			finalizer = parseBlock();
		}

		if (handlers.length === 0 && !finalizer) {
			throwError({ }, Messages.NoCatchOrFinally);
		}

		return delegate.createTryStatement(block, [ ], handlers, finalizer);

	}

	// 12.15 The debugger statement

	function parseDebuggerStatement() {

		expectKeyword('debugger');

		consumeSemicolon();

		return delegate.createDebuggerStatement();

	}

	// 12 Statements

	function parseStatement(asExpression) {

		var statement, expr, switchedAsExpression = false;

		if (asExpression) {
			parsingAsExpression = true;
			switchedAsExpression = true;
		}

		statement = parseStatementByType();
		if (parsingAsExpression && switchedAsExpression)
			parsingAsExpression = false;
		if (statement !== undefined) {
			if (asExpression)
				statement = delegate.createStatementExpression(statement);
			return statement;
		}

		if (asExpression)
			return throwUnexpected(lex());

		if (parsingAsExpression)
			expr = parseAssignmentExpression();
		else
			expr = parseExpression();

		if (!parsingAsExpression)
			consumeSemicolon();

		return delegate.createExpressionStatement(expr);

	}

	function parseStatementByType() {

		var type = lookahead.type;

		if (type === Token.EOF) {
			throwUnexpected(lookahead);
		}

		if (type === Token.Punctuator) {
			switch (lookahead.value) {
			case ';':
				if (parsingAsExpression) {
					break;
				}
				return parseEmptyStatement();
			case ':{':
				return parseBlock();
			case '(':
				if (parsingAsExpression) {
					break;
				}
				return parseExpressionStatement();
			case ':':
				return parseLabeledStatement();
			default:
				break;
			}
		}

		if (type === Token.Keyword) {
			switch (lookahead.value) {
			case 'break':
				if (parsingAsExpression)
					break;
				return parseBreakStatement();
			case 'continue':
				if (parsingAsExpression)
					break;
				return parseContinueStatement();
			case 'debugger':
				if (parsingAsExpression)
					break;
				return parseDebuggerStatement();
			case 'do':
				return parseDoWhileStatement();
			case 'for':
				return parseForStatement();
			case 'fn':
				// TODO: Remove?
				// TODO: Why are `gen` and `async` not listed? Should they be
				// added?
				// What is `parseStatement` used for?
				return parseFunctionDeclaration();
			case 'if':
				return parseIfStatement();
			case 'return':
				if (parsingAsExpression)
					break;
				return parseReturnStatement();
			case 'switch':
				return parseSwitchStatement();
			case 'throw':
				if (parsingAsExpression)
					break;
				return parseThrowStatement();
			case 'try':
				return parseTryStatement();
			case 'while':
				return parseWhileStatement();
			case 'with':
				return parseCascadeStatement();
			default:
				break;
			}
		}

	}

	// 13 Function Definition

	function parseConciseBody() {
		if (match(':{') || match('::{')) {
			lex();
			return parseFunctionSourceElements();
		}
		return parseAssignmentExpression();
	}

	function parseFunctionSourceElements() {

		var sourceElement, sourceElements = [ ], token, directive,
			oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody,
			oldParenthesizedCount, oldInCascadeCount;

		while (index < length) {
			if (lookahead.type !== Token.StringLiteral) {
				break;
			}
			token = lookahead;

			sourceElement = parseSourceElement();
			sourceElements.push(sourceElement);
			if (sourceElement.expression.type !== Syntax.Literal) {
				// this is not directive
				break;
			}
			directive = source.slice(token.range[0] + 1, token.range[1] - 1);
		}

		oldLabelSet = state.labelSet;
		oldInIteration = state.inIteration;
		oldInSwitch = state.inSwitch;
		oldInFunctionBody = state.inFunctionBody;
		oldParenthesizedCount = state.parenthesizedCount;
		oldInCascadeCount = state.inCascadeCount;

		state.labelSet = { };
		state.inIteration = false;
		state.inSwitch = false;
		state.inFunctionBody = true;
		state.parenthesizedCount = 0;
		state.inCascadeCount = 0;

		while (index < length) {
			if (match('}')) {
				break;
			}
			sourceElement = parseSourceElement();
			if (typeof sourceElement === 'undefined') {
				break;
			}
			sourceElements.push(sourceElement);
		}

		expect('}');

		state.labelSet = oldLabelSet;
		state.inIteration = oldInIteration;
		state.inSwitch = oldInSwitch;
		state.inFunctionBody = oldInFunctionBody;
		state.parenthesizedCount = oldParenthesizedCount;
		state.inCascadeCount = oldInCascadeCount;

		return delegate.createBlockStatement(sourceElements);

	}

	function validateParam(options, param, name) {
		var key = '$' + name;
		if (hasOwn(options.paramSet, key))
			throwErrorTolerant(param, Messages.ParamDupe);
		options.paramSet[key] = true;
	}

	function parseParam(options) {

		var token, rest, param, def, coercive;

		token = lookahead;
		if (token.value === '...') {
			token = lex();
			rest = true;
		}

		if (match('[')) {
			param = parseArrayInitialiser();
			reinterpretAsDestructuredParameter(options, param);
		}
		else if (match('{')) {
			if (rest)
				throwError({ }, Messages.ObjectPatternAsRestParameter);
			param = parseObjectInitialiser();
			reinterpretAsDestructuredParameter(options, param);
		}
		else {
			param = parseVariableIdentifier();
			validateParam(options, token, token.value);
			if (match('=')) {
				if (rest)
					throwErrorTolerant(
						lookahead, Messages.DefaultRestParameter
					);
				lex();
				def = parseAssignmentExpression();
				++options.defaultCount;
			}
			if (match('|')) {
				if (rest)
					throwErrorTolerant(
						lookahead, Messages.CoerciveRestParameter
					);
				lex();
				coercive = parseCoercive();
				++options.coerciveCount;
			}
		}

		if (rest) {
			if (!match(')'))
				throwError({ }, Messages.ParameterAfterRestParameter);
			options.rest = param;
			return false;
		}

		options.params.push(param);
		options.defaults.push(def);
		options.coercives.push(coercive);

		return !match(')');

	}

	function parseParams() {

		var options;

		options = {
			params: [ ],
			defaultCount: 0,
			defaults: [ ],
			coerciveCount: 0,
			coercives: [ ],
			rest: null
		};

		expect('(');

		if (!match(')')) {
			options.paramSet = { };
			while (index < length) {
				if (!parseParam(options)) {
					break;
				}
				expect(',');
			}
		}

		expect(')');

		if (options.defaultCount === 0) {
			options.defaults = [ ];
		}
		if (options.coerciveCount === 0) {
			options.coercives = [ ];
		}

		return options;

	}

	function parseFunctionOrGeneratorDeclaration(generator, async) {

		var id, body, token, tmp, previousYieldAllowed, previousAwaitAllowed,
			lexicalThis, createNode, expression, params, defaults, coercives,
			rest, arity;

		arity = null;
		token = lookahead;

		id = parseVariableIdentifier();

		if (match('(')) {
			tmp = parseParams();
			params = tmp.params;
			defaults = tmp.defaults;
			coercives = tmp.coercives;
			rest = tmp.rest;
		}
		else {
			params = [ ];
			defaults = [ ];
			coercives = [ ];
			rest = null;
		}

		if (matchKeyword('of')) {
			lex();
			arity = parseAssignmentExpression();
		}

		previousYieldAllowed = state.yieldAllowed;
		state.yieldAllowed = generator;
		previousAwaitAllowed = state.awaitAllowed;
		state.awaitAllowed = async;

		lexicalThis = match('::{') || match('::');
		expression = match(':') || match('::');

		if (match(':{') || match('::{') || match(':') || match('::'))
			lex();
		else
			throwUnexpected(lookahead);

		if (expression)
			body = parseAssignmentExpression();
		else
			body = parseFunctionSourceElements();

		state.yieldAllowed = previousYieldAllowed;
		state.awaitAllowed = previousAwaitAllowed;

		return delegate.createFunctionDeclaration(
			id, params, defaults, coercives, body, rest, generator, async,
			lexicalThis, expression, arity
		);

	}

	function parseFunctionDeclaration() {
		expectKeyword('fn');
		return parseFunctionOrGeneratorDeclaration(false, false);
	}

	function parseGeneratorDeclaration() {
		expectKeyword('gen');
		return parseFunctionOrGeneratorDeclaration(true, false);
	}

	function parseAsyncDeclaration() {
		expectKeyword('async');
		return parseFunctionOrGeneratorDeclaration(false, true);
	}

	function parseFunctionExpression(type) {

		var id, tmp, body, previousYieldAllowed, previousAwaitAllowed,
			lexicalThis, generator, async, params, defaults, coercives, rest,
			expression, arity;

		id = null;
		arity = null;
		generator = type === 'gen';
		async = type === 'async';

		expectKeyword(type);

		if (!match('(') && !match(':{') && !match('::{') && !match(':')
		&& !match('::'))
			id = parseVariableIdentifier();

		if (match('(')) {
			tmp = parseParams();
			params = tmp.params;
			defaults = tmp.defaults;
			coercives = tmp.coercives;
			rest = tmp.rest;
		}
		else {
			params = [ ];
			defaults = [ ];
			coercives = [ ];
			rest = null;
		}

		if (matchKeyword('of')) {
			lex();
			arity = parseAssignmentExpression();
		}

		previousYieldAllowed = state.yieldAllowed;
		state.yieldAllowed = generator;
		previousAwaitAllowed = state.awaitAllowed;
		state.awaitAllowed = async;

		lexicalThis = match('::{') || match('::');
		expression = match(':') || match('::');

		if (match(':{') || match('::{') || match(':') || match('::'))
			lex();
		else
			throwUnexpected(lookahead);

		if (expression)
			body = parseAssignmentExpression();
		else
			body = parseFunctionSourceElements();

		state.yieldAllowed = previousYieldAllowed;
		state.awaitAllowed = previousAwaitAllowed;

		return delegate.createFunctionExpression(
			id, params, defaults, coercives, body, rest, generator, async,
			lexicalThis, expression, arity
		);

	}

	function parseYieldExpression() {

		var delegateFlag, expr, previousYieldAllowed, previousAwaitAllowed;

		expectKeyword('yield');

		if (!state.yieldAllowed) {
			throwErrorTolerant({ }, Messages.IllegalYield);
		}

		delegateFlag = false;
		if (match('...')) {
			lex();
			delegateFlag = true;
		}

		// It is a Syntax Error if any AssignmentExpression Contains
		// YieldExpression.
		// TODO: Does this make sense?  What does this do?
		previousYieldAllowed = state.yieldAllowed;
		state.yieldAllowed = false;
		previousAwaitAllowed = state.awaitAllowed;
		state.awaitAllowed = false;
		expr = parseAssignmentExpression();
		state.yieldAllowed = previousYieldAllowed;
		state.awaitAllowed = previousAwaitAllowed;
		state.yieldFound = true;

		return delegate.createYieldExpression(expr, delegateFlag);

	}

	// 15 Program

	function matchModuleDeclaration() {
		var id;
		if (matchContextualKeyword('module')) {
			id = lookahead2();
			return id.type === Token.StringLiteral
				|| id.type === Token.Identifier;
		}
		return false;
	}

	function parseSourceElement() {

		if (lookahead.type === Token.Keyword) {
			switch (lookahead.value) {
			case 'var':
			case 'sym':
			case 'const':
				return parseDeclaration(lookahead.value);
			case 'fn':
				return parseFunctionDeclaration();
			case 'gen':
				return parseGeneratorDeclaration();
			case 'async':
				return parseAsyncDeclaration();
			case 'export':
				return parseExportDeclaration();
			case 'import':
				return parseImportDeclaration();
			default:
				return parseStatement();
			}
		}

		if (matchModuleDeclaration())
			throwError({ }, Messages.NestedModule);

		if (lookahead.type !== Token.EOF)
			return parseStatement();

	}

	function parseProgramElement() {

		if (lookahead.type === Token.Keyword) {
			switch (lookahead.value) {
			case 'export':
				return parseExportDeclaration();
			case 'import':
				return parseImportDeclaration();
			}
		}

		if (matchModuleDeclaration()) {
			return parseModuleDeclaration();
		}

		return parseSourceElement();

	}

	function parseProgramElements() {

		var sourceElement, sourceElements = [ ], token, directive;

		while (index < length) {
			token = lookahead;
			if (token.type !== Token.StringLiteral) {
				break;
			}

			sourceElement = parseProgramElement();
			sourceElements.push(sourceElement);
			if (sourceElement.expression.type !== Syntax.Literal) {
				// this is not directive
				break;
			}
			directive = source.slice(token.range[0] + 1, token.range[1] - 1);
		}

		while (index < length) {
			sourceElement = parseProgramElement();
			if (typeof sourceElement === 'undefined') {
				break;
			}
			sourceElements.push(sourceElement);
		}

		return sourceElements;

	}

	function parseModuleElement() {
		return parseSourceElement();
	}

	function parseModuleElements() {

		var list = [ ],
			statement;

		while (index < length) {
			if (match('}')) {
				break;
			}
			statement = parseModuleElement();
			if (typeof statement === 'undefined') {
				break;
			}
			list.push(statement);
		}

		return list;

	}

	function parseModuleBlock() {

		var block;

		// TODO: Is :{ correct here?
		expect(':{');

		block = parseModuleElements();

		expect('}');

		return delegate.createBlockStatement(block);

	}

	function parseProgram() {
		var body;
		peek();
		body = parseProgramElements();
		return delegate.createProgram(body);
	}

	// The following functions are needed only when the option to preserve
	// the comments is active.

	function addComment(type, value, start, end, loc) {

		assert(typeof start === 'number', 'Comment must have valid position');

		// Because the way the actual token is scanned, often the comments
		// (if any) are skipped twice during the lexical analysis.
		// Thus, we need to skip adding a comment if the comment array already
		// handled it.
		if (extra.comments.length > 0) {
			if (extra.comments[extra.comments.length - 1].range[1] > start) {
				return;
			}
		}

		extra.comments.push({
			type: type,
			value: value,
			range: [ start, end ],
			loc: loc
		});

	}

	function scanComment() {

		var comment, ch, loc, start, blockComment, lineComment;

		comment = '';
		blockComment = false;
		lineComment = false;

		while (index < length) {
			ch = source[index];

			if (lineComment) {
				ch = source[index++];
				if (isLineTerminator(ch.charCodeAt(0))) {
					loc.end = {
						line: lineNumber,
						column: index - lineStart - 1
					};
					lineComment = false;
					addComment('Line', comment, start, index - 1, loc);
					if (ch === '\r' && source[index] === '\n') {
						++index;
					}
					++lineNumber;
					lineStart = index;
					comment = '';
				}
				else if (index >= length) {
					lineComment = false;
					comment += ch;
					loc.end = {
						line: lineNumber,
						column: length - lineStart
					};
					addComment('Line', comment, start, length, loc);
				}
				else
					comment += ch;
			}
			else if (blockComment) {
				if (isLineTerminator(ch.charCodeAt(0))) {
					if (ch === '\r' && source[index + 1] === '\n') {
						++index;
						comment += '\r\n';
					}
					else
						comment += ch;
					++lineNumber;
					++index;
					lineStart = index;
					if (index >= length) {
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}
				}
				else {
					ch = source[index++];
					if (index >= length)
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					comment += ch;
					if (ch === '*') {
						ch = source[index];
						if (ch === '/') {
							comment = comment.substr(0, comment.length - 1);
							blockComment = false;
							++index;
							loc.end = {
								line: lineNumber,
								column: index - lineStart
							};
							addComment('Block', comment, start, index, loc);
							comment = '';
						}
					}
				}
			}
			else if (ch === '/') {
				ch = source[index + 1];
				if (ch === '/') {
					loc = {
						start: {
							line: lineNumber,
							column: index - lineStart
						}
					};
					start = index;
					index += 2;
					lineComment = true;
					if (index >= length) {
						loc.end = {
							line: lineNumber,
							column: index - lineStart
						};
						lineComment = false;
						addComment('Line', comment, start, index, loc);
					}
				}
				else if (ch === '*') {
					start = index;
					index += 2;
					blockComment = true;
					loc = {
						start: {
							line: lineNumber,
							column: index - lineStart - 2
						}
					};
					if (index >= length) {
						throwError({ }, Messages.UnexpectedToken, 'ILLEGAL');
					}
				}
				else
					break;
			}
			else if (isWhiteSpace(ch.charCodeAt(0)))
				++index;
			else if (isLineTerminator(ch.charCodeAt(0))) {
				++index;
				if (ch === '\r' && source[index] === '\n') {
					++index;
				}
				++lineNumber;
				lineStart = index;
			}
			else
				break;
		}

	}

	function filterCommentLocation() {

		var i, entry, comment, comments = [ ];

		for (i = 0; i < extra.comments.length; ++i) {
			entry = extra.comments[i];
			comment = {
				type: entry.type,
				value: entry.value
			};
			if (extra.range) {
				comment.range = entry.range;
			}
			if (extra.loc) {
				comment.loc = entry.loc;
			}
			comments.push(comment);
		}

		extra.comments = comments;

	}

	function collectToken() {

		var start, loc, token, range, value;

		skipComment();
		start = index;
		loc = {
			start: {
				line: lineNumber,
				column: index - lineStart
			}
		};

		token = extra.advance();
		loc.end = {
			line: lineNumber,
			column: index - lineStart
		};

		if (token.type !== Token.EOF) {
			range = [ token.range[0], token.range[1] ];
			value = source.slice(token.range[0], token.range[1]);
			extra.tokens.push({
				type: TokenName[token.type],
				value: value,
				range: range,
				loc: loc
			});
		}

		return token;

	}

	function collectRegex() {

		var pos, loc, regex, token;

		skipComment();

		pos = index;
		loc = {
			start: {
				line: lineNumber,
				column: index - lineStart
			}
		};

		regex = extra.scanRegExp();
		loc.end = {
			line: lineNumber,
			column: index - lineStart
		};

		if (!extra.tokenize) {
			// Pop the previous token, which is likely '/' or '/='
			if (extra.tokens.length > 0) {
				token = extra.tokens[extra.tokens.length - 1];
				if (token.range[0] === pos && token.type === 'Punctuator') {
					if (token.value === '/' || token.value === '/=') {
						extra.tokens.pop();
					}
				}
			}

			extra.tokens.push({
				type: 'RegularExpression',
				value: regex.literal,
				range: [ pos, index ],
				loc: loc
			});
		}

		return regex;

	}

	function filterTokenLocation() {

		var i, entry, token, tokens = [ ];

		for (i = 0; i < extra.tokens.length; ++i) {
			entry = extra.tokens[i];
			token = {
				type: entry.type,
				value: entry.value
			};
			if (extra.range) {
				token.range = entry.range;
			}
			if (extra.loc) {
				token.loc = entry.loc;
			}
			tokens.push(token);
		}

		extra.tokens = tokens;

	}

	function LocationMarker() {
		this.range = [ index, index ];
		this.loc = {
			start: {
				line: lineNumber,
				column: index - lineStart
			},
			end: {
				line: lineNumber,
				column: index - lineStart
			}
		};
	}

	LocationMarker.prototype = {

		constructor: LocationMarker,

		end: function() {
			this.range[1] = index;
			this.loc.end.line = lineNumber;
			this.loc.end.column = index - lineStart;
		},

		applyGroup: function(node) {
			if (extra.range) {
				node.groupRange = [ this.range[0], this.range[1] ];
			}
			if (extra.loc) {
				node.groupLoc = {
					start: {
						line: this.loc.start.line,
						column: this.loc.start.column
					},
					end: {
						line: this.loc.end.line,
						column: this.loc.end.column
					}
				};
				node = delegate.postProcess(node);
			}
		},

		apply: function(node) {
			var nodeType = typeof node;
			assert(nodeType === 'object',
				'Applying location marker to an unexpected node type: '
				+ nodeType
			);

			if (extra.range) {
				node.range = [ this.range[0], this.range[1] ];
			}
			if (extra.loc) {
				node.loc = {
					start: {
						line: this.loc.start.line,
						column: this.loc.start.column
					},
					end: {
						line: this.loc.end.line,
						column: this.loc.end.column
					}
				};
				node = delegate.postProcess(node);
			}
		}

	};

	function createLocationMarker() {
		return new LocationMarker();
	}

	function trackGroupExpression() {

		var marker, expr;

		skipComment();
		marker = createLocationMarker();
		expect('(');

		++state.parenthesizedCount;

		expr = parseExpression();

		expect(')');
		marker.end();
		marker.applyGroup(expr);

		return expr;

	}

	function trackLeftHandSideExpression(allowCall) {

		var marker, expr, args;

		skipComment();
		marker = createLocationMarker();

		expr = matchKeyword('new')
			? parseNewExpression() : parsePrimaryExpression();

		do {
			if (allowCall && match('(')) {
				args = parseArguments();
				expr = delegate.createCallExpression(expr, args);
				marker.end();
				marker.apply(expr);
			}
			else if (match('[')) {
				expr = delegate.createMemberExpression(
					true, false, expr, parseComputedMember()
				);
				marker.end();
				marker.apply(expr);
			}
			else if (match('.')) {
				expr = delegate.createMemberExpression(
					false, false, expr, parseNonComputedMember()
				);
				marker.end();
				marker.apply(expr);
			}
			else if (match('::')) {
				expr = delegate.createBinaryExpression(
					'::', expr, parseBoundMember()
				);
				marker.end();
				marker.apply(expr);
			}
			else if (match('#[')) {
				expr = delegate.createMemberExpression(
					true, true, expr, parseComputedMember(true)
				);
				marker.end();
				marker.apply(expr);
			}
			else if(match('#')) {
				expr = delegate.createMemberExpression(
					false, true, expr, parseNonComputedMember(true)
				);
				marker.end();
				marker.apply(expr);
			}
			else if(match(':(')) {
				args = parseArguments(true);
				expr = delegate.createPartialApplicationExpression(expr, args);
				marker.end();
				marker.apply(expr);
			}
			else if (lookahead.type === Token.Template) {
				expr = delegate.createTaggedTemplateExpression(
					expr, parseTemplateLiteral()
				);
				marker.end();
				marker.apply(expr);
			}
			else
				break;
		} while (true);

		return expr;

	}

	function filterGroup(node) {

		var n, i, entry;

		n = getStringTag(node) === '[object Array]' ? [ ] : { };
		for (i in node) {
			if (hasOwn(node, i)
			&& i !== 'groupRange'
			&& i !== 'groupLoc') {
				entry = node[i];
				if (entry === null
				|| typeof entry !== 'object'
				|| entry instanceof RegExp)
					n[i] = entry;
				else
					n[i] = filterGroup(entry);
			}
		}

		return n;

	}

	function wrapTrackingFunction(range, loc) {

		return function(parseFunction) {

			function isBinary(node) {
				return node.type === Syntax.LogicalExpression
					|| node.type === Syntax.BinaryExpression;
			}

			function visit(node) {

				var start, end;

				if (isBinary(node.left))
					visit(node.left);
				if (isBinary(node.right))
					visit(node.right);

				if (range) {
					if (node.left.groupRange || node.right.groupRange) {
						start = node.left.groupRange
							? node.left.groupRange[0] : node.left.range[0];
						end = node.right.groupRange
							? node.right.groupRange[1] : node.right.range[1];
						node.range = [ start, end ];
					}
					else if (typeof node.range === 'undefined') {
						start = node.left.range[0];
						end = node.right.range[1];
						node.range = [ start, end ];
					}
				}
				if (loc) {
					if (node.left.groupLoc || node.right.groupLoc) {
						start = node.left.groupLoc
							? node.left.groupLoc.start : node.left.loc.start;
						end = node.right.groupLoc
							? node.right.groupLoc.end : node.right.loc.end;
						node.loc = {
							start: start,
							end: end
						};
						node = delegate.postProcess(node);
					}
					else if (typeof node.loc === 'undefined') {
						node.loc = {
							start: node.left.loc.start,
							end: node.right.loc.end
						};
						node = delegate.postProcess(node);
					}
				}
			}

			return function() {

				var marker, node;

				skipComment();

				marker = createLocationMarker();
				node = parseFunction.apply(null, arguments);
				marker.end();

				if (range && typeof node.range === 'undefined') {
					marker.apply(node);
				}

				if (loc && typeof node.loc === 'undefined') {
					marker.apply(node);
				}

				if (isBinary(node)) {
					visit(node);
				}

				return node;

			};
		};
	}

	function patch() {

		var wrapTracking;

		if (extra.comments) {
			extra.skipComment = skipComment;
			skipComment = scanComment;
		}

		if (extra.range || extra.loc) {

			extra.parseGroupExpression = parseGroupExpression;
			extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
			parseGroupExpression = trackGroupExpression;
			parseLeftHandSideExpression = trackLeftHandSideExpression;

			wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

			extra.parseAssignmentExpression = parseAssignmentExpression;
			extra.parseBinaryExpression = parseBinaryExpression;
			extra.parseBlock = parseBlock;
			extra.parseFunctionSourceElements = parseFunctionSourceElements;
			extra.parseCatchClause = parseCatchClause;
			extra.parseComputedMember = parseComputedMember;
			extra.parseConditionalExpression = parseConditionalExpression;
			extra.parseDeclaration = parseDeclaration;
			extra.parseExportBatchSpecifier = parseExportBatchSpecifier;
			extra.parseExportDeclaration = parseExportDeclaration;
			extra.parseExportSpecifier = parseExportSpecifier;
			extra.parseExpression = parseExpression;
			extra.parseForVariableDeclaration = parseForVariableDeclaration;
			extra.parseFunctionDeclaration = parseFunctionDeclaration;
			extra.parseGeneratorDeclaration = parseGeneratorDeclaration;
			extra.parseAsyncDeclaration = parseAsyncDeclaration;
			extra.parseFunctionExpression = parseFunctionExpression;
			extra.parseParams = parseParams;
			extra.parseImportDeclaration = parseImportDeclaration;
			extra.parseImportSpecifier = parseImportSpecifier;
			extra.parseModuleDeclaration = parseModuleDeclaration;
			extra.parseModuleBlock = parseModuleBlock;
			extra.parseNewExpression = parseNewExpression;
			extra.parseNonComputedProperty = parseNonComputedProperty;
			extra.parseObjectProperty = parseObjectProperty;
			extra.parseObjectPropertyKey = parseObjectPropertyKey;
			extra.parsePostfixExpression = parsePostfixExpression;
			extra.parsePrimaryExpression = parsePrimaryExpression;
			extra.parseProgram = parseProgram;
			extra.parsePropertyFunction = parsePropertyFunction;
			extra.parseSpreadOrAssignmentExpression = parseSpreadOrAssignmentExpression;
			extra.parseTemplateElement = parseTemplateElement;
			extra.parseTemplateLiteral = parseTemplateLiteral;
			extra.parseStatement = parseStatement;
			extra.parseSwitchCase = parseSwitchCase;
			extra.parseUnaryExpression = parseUnaryExpression;
			extra.parseVariableDeclaration = parseVariableDeclaration;
			extra.parseVariableIdentifier = parseVariableIdentifier;

			parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
			parseBinaryExpression = wrapTracking(extra.parseBinaryExpression);
			parseBlock = wrapTracking(extra.parseBlock);
			parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
			parseCatchClause = wrapTracking(extra.parseCatchClause);
			parseComputedMember = wrapTracking(extra.parseComputedMember);
			parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
			parseDeclaration = wrapTracking(extra.parseDeclaration);
			parseExportBatchSpecifier = wrapTracking(parseExportBatchSpecifier);
			parseExportDeclaration = wrapTracking(parseExportDeclaration);
			parseExportSpecifier = wrapTracking(parseExportSpecifier);
			parseExpression = wrapTracking(extra.parseExpression);
			parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
			parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
			parseGeneratorDeclaration = wrapTracking(extra.parseGeneratorDeclaration);
			parseAsyncDeclaration = wrapTracking(extra.parseAsyncDeclaration);
			parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
			parseParams = wrapTracking(extra.parseParams);
			parseImportDeclaration = wrapTracking(extra.parseImportDeclaration);
			parseImportSpecifier = wrapTracking(extra.parseImportSpecifier);
			parseModuleDeclaration = wrapTracking(extra.parseModuleDeclaration);
			parseModuleBlock = wrapTracking(extra.parseModuleBlock);
			parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
			parseNewExpression = wrapTracking(extra.parseNewExpression);
			parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
			parseObjectProperty = wrapTracking(extra.parseObjectProperty);
			parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
			parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
			parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
			parseProgram = wrapTracking(extra.parseProgram);
			parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
			parseTemplateElement = wrapTracking(extra.parseTemplateElement);
			parseTemplateLiteral = wrapTracking(extra.parseTemplateLiteral);
			parseSpreadOrAssignmentExpression = wrapTracking(extra.parseSpreadOrAssignmentExpression);
			parseStatement = wrapTracking(extra.parseStatement);
			parseSwitchCase = wrapTracking(extra.parseSwitchCase);
			parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
			parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
			parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);

		}

		if (typeof extra.tokens !== 'undefined') {

			extra.advance = advance;
			extra.scanRegExp = scanRegExp;

			advance = collectToken;
			scanRegExp = collectRegex;

		}

	}

	function unpatch() {

		if (typeof extra.skipComment === 'function')
			skipComment = extra.skipComment;

		if (extra.range || extra.loc) {
			parseAssignmentExpression = extra.parseAssignmentExpression;
			parseBinaryExpression = extra.parseBinaryExpression;
			parseBlock = extra.parseBlock;
			parseFunctionSourceElements = extra.parseFunctionSourceElements;
			parseCatchClause = extra.parseCatchClause;
			parseComputedMember = extra.parseComputedMember;
			parseConditionalExpression = extra.parseConditionalExpression;
			parseDeclaration = extra.parseDeclaration;
			parseExportBatchSpecifier = extra.parseExportBatchSpecifier;
			parseExportDeclaration = extra.parseExportDeclaration;
			parseExportSpecifier = extra.parseExportSpecifier;
			parseExpression = extra.parseExpression;
			parseForVariableDeclaration = extra.parseForVariableDeclaration;
			parseFunctionDeclaration = extra.parseFunctionDeclaration;
			parseGeneratorDeclaration = extra.parseGeneratorDeclaration;
			parseAsyncDeclaration = extra.parseAsyncDeclaration;
			parseFunctionExpression = extra.parseFunctionExpression;
			parseImportDeclaration = extra.parseImportDeclaration;
			parseImportSpecifier = extra.parseImportSpecifier;
			parseGroupExpression = extra.parseGroupExpression;
			parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
			parseModuleDeclaration = extra.parseModuleDeclaration;
			parseModuleBlock = extra.parseModuleBlock;
			parseNewExpression = extra.parseNewExpression;
			parseNonComputedProperty = extra.parseNonComputedProperty;
			parseObjectProperty = extra.parseObjectProperty;
			parseObjectPropertyKey = extra.parseObjectPropertyKey;
			parsePostfixExpression = extra.parsePostfixExpression;
			parsePrimaryExpression = extra.parsePrimaryExpression;
			parseProgram = extra.parseProgram;
			parsePropertyFunction = extra.parsePropertyFunction;
			parseTemplateElement = extra.parseTemplateElement;
			parseTemplateLiteral = extra.parseTemplateLiteral;
			parseSpreadOrAssignmentExpression = extra.parseSpreadOrAssignmentExpression;
			parseStatement = extra.parseStatement;
			parseSwitchCase = extra.parseSwitchCase;
			parseUnaryExpression = extra.parseUnaryExpression;
			parseVariableDeclaration = extra.parseVariableDeclaration;
			parseVariableIdentifier = extra.parseVariableIdentifier;
		}

		if (typeof extra.scanRegExp === 'function') {
			advance = extra.advance;
			scanRegExp = extra.scanRegExp;
		}

	}

	// This is used to modify the delegate.
	function extend(object, properties) {

		var entry, result = { };

		for (entry in object)
			if (hasOwn(object, entry))
				result[entry] = object[entry];

		for (entry in properties)
			if (hasOwn(properties, entry))
				result[entry] = properties[entry];

		return result;

	}

	function tokenize(code, options) {

		var token, tokens;

		if (typeof code !== 'string' && !(code instanceof String))
			code = String(code);

		delegate = SyntaxTreeDelegate;
		source = code;
		index = 0;
		lineNumber = (source.length > 0) ? 1 : 0;
		lineStart = 0;
		length = source.length;
		lookahead = null;
		state = {
			allowKeyword: true,
			labelSet: { },
			inFunctionBody: false,
			inIteration: false,
			inSwitch: false
		};

		extra = { };

		// Options matching.
		options = options || { };

		// Of course we collect tokens here.
		options.tokens = true;
		extra.tokens = [ ];
		extra.tokenize = true;
		// The following two fields are necessary to compute the Regex tokens.
		extra.openParenToken = -1;
		extra.openCurlyToken = -1;

		extra.range = (typeof options.range === 'boolean') && options.range;
		extra.loc = (typeof options.loc === 'boolean') && options.loc;

		if (typeof options.comment === 'boolean' && options.comment)
			extra.comments = [ ];
		if (typeof options.tolerant === 'boolean' && options.tolerant)
			extra.errors = [ ];

		if (length > 0
		&& typeof source[0] === 'undefined'
		&& code instanceof String) {
			// Try first to convert to a string. This is good as fast path
			// for old IE which understands string indexing for string
			// literals only and not for string object.
			source = code.valueOf();
		}

		patch();

		try {

			peek();

			if (lookahead.type === Token.EOF)
				return extra.tokens;

			token = lex();
			while (lookahead.type !== Token.EOF) {
				try {
					token = lex();
				}
				catch (lexError) {
					token = lookahead;
					if (extra.errors) {
						extra.errors.push(lexError);
						// We have to break on the first error
						// to avoid infinite loops.
						break;
					}
					else
						throw lexError;
				}
			}

			filterTokenLocation();
			tokens = extra.tokens;

			if (typeof extra.comments !== 'undefined') {
				filterCommentLocation();
				tokens.comments = extra.comments;
			}

			if (typeof extra.errors !== 'undefined')
				tokens.errors = extra.errors;

		}
		catch (e) {
			throw e;
		}
		finally {
			unpatch();
			extra = { };
		}

		return tokens;

	}

	function parse(code, options) {

		var program;

		if (typeof code !== 'string' && !(code instanceof String))
			code = String(code);

		delegate = SyntaxTreeDelegate;
		source = code;
		index = 0;
		lineNumber = (source.length > 0) ? 1 : 0;
		lineStart = 0;
		length = source.length;
		lookahead = null;
		parsingAsExpression = false;
		state = {
			allowKeyword: false,
			labelSet: { },
			parenthesizedCount: 0,
			inCascadeCount: 0,
			inFunctionBody: false,
			inIteration: false,
			inSwitch: false,
			yieldAllowed: false,
			// TODO: Can `yieldFound` be removed? What was it for originally?
			yieldFound: false,
			awaitAllowed: false,
			// TODO: If `yieldFound` can't be removed, should there be an
			// `awaitFound`?
			eachAllowed: false
		};

		extra = { };
		if (typeof options !== 'undefined') {

			extra.range = typeof options.range === 'boolean' && options.range;
			extra.loc = typeof options.loc === 'boolean' && options.loc;

			if (extra.loc
			&& options.source !== null
			&& options.source !== undefined)
				delegate = extend(delegate, {
					postProcess: function(node) {
						node.loc.source = String(options.source);
						return node;
					}
				});

			if (typeof options.tokens === 'boolean' && options.tokens)
				extra.tokens = [ ];
			if (typeof options.comment === 'boolean' && options.comment)
				extra.comments = [ ];
			if (typeof options.tolerant === 'boolean' && options.tolerant)
				extra.errors = [ ];

		}

		if (length > 0
		&& typeof source[0] === 'undefined'
		&& code instanceof String) {
			// Try first to convert to a string. This is good as fast path
			// for old IE which understands string indexing for string
			// literals only and not for string object.
			source = code.valueOf();
		}

		patch();
		try {
			program = parseProgram();
			if (typeof extra.comments !== 'undefined') {
				filterCommentLocation();
				program.comments = extra.comments;
			}
			if (typeof extra.tokens !== 'undefined') {
				filterTokenLocation();
				program.tokens = extra.tokens;
			}
			if (typeof extra.errors !== 'undefined')
				program.errors = extra.errors;
			if (extra.range || extra.loc)
				program.body = filterGroup(program.body);
		}
		catch (e) {
			throw e;
		}
		finally {
			unpatch();
			extra = { };
		}

		return program;

	}

	// Sync with package.json and component.json.
	exports.version = '1.1.0-dev-harmony';

	exports.tokenize = tokenize;

	exports.parse = parse;

	// Deep copy.
	exports.Syntax = (function() {

		var name, types = { };

		if (typeof Object.create === 'function')
			types = Object.create(null);

		for (name in Syntax)
			if (hasOwn(Syntax, name))
				types[name] = Syntax[name];

		if (typeof Object.freeze === 'function')
			Object.freeze(types);

		return types;

	}());

	exports.SyntaxTreeDelegate = (function() {

		var name, types = { };

		if (typeof Object.create === 'function')
			types = Object.create(null);

		for (name in SyntaxTreeDelegate)
			if (hasOwn(SyntaxTreeDelegate, name))
				types[name] = SyntaxTreeDelegate[name];

		if (typeof Object.freeze === 'function')
			Object.freeze(types);

		return types;

	}());

}));