'use strict';

function assert(v, message='Assertion failed') {
	if (v) return;
	if (typeof message === 'function') {
		message = message();
	}
	throw new Error(message);
}

function empty(node) {
	var last;
	while ((last = node.lastChild)) {
		node.removeChild(last);
	}
}

function attr(el, init_attrs) {
	if (init_attrs) {
		for (var k in init_attrs) {
			el.setAttribute(k, init_attrs[k]);
		}
	}
}

function el(parent, tagName, init_attrs, text) {
	var doc = parent ? parent.ownerDocument : document;
	var el = doc.createElement(tagName);
	if (typeof init_attrs === 'string') {
		init_attrs = {
			'class': init_attrs,
		};
	}
	attr(el, init_attrs);
	if ((text !== undefined) && (text !== null)) {
		el.appendChild(doc.createTextNode(text));
	}
	if (parent) {
		parent.appendChild(el);
	}
	return el;
}

function parsePlayers(pgn) {
	const white_m = /\[White "([^"]*)"\]/.exec(pgn);
	const black_m = /\[Black "([^"]*)"\]/.exec(pgn);
	if (!white_m || !black_m) {
		throw new Error('Could not find player names: Not a game PGN? ' + pgn.slice(0, 1000));
	}
	return [white_m[1], black_m[1]];
}

function loadPgn(chess, pgn) {
	let corePgnIndex = pgn.search(/\r?\n\s*?\r?\n/);
	if (corePgnIndex < 0) corePgnIndex = 0;
	const corePgn = pgn.substring(corePgnIndex).trim();

	const r = chess.load_pgn(corePgn, {});
	assert(r, () => `Failed to load PGN ${JSON.stringify(pgn)}`);
}

function countPieces(chess, playerColor) {
	const fen = chess.fen();
	const fenPosition = fen.split(' ')[0];
	const res = {k: 0, q:0, r: 0, b: 0, n: 0, p: 0};
	const pieceMap = {
		w: {K: 'k', Q: 'q', R: 'r', B: 'b', N: 'n', 'P': 'p'},
		b: {k: 'k', q: 'q', r: 'r', b: 'b', n: 'n', 'p': 'p'},
	}[playerColor];

	for (const fenChar of fenPosition) {
		const piece = pieceMap[fenChar];
		if (piece) {
			res[piece]++;
		}
	}
	return res;
}

function percent(count, totalCount) {
	const res = +(count * 100 / totalCount).toFixed(1);
	return `${res}%`;
}

async function analyze(e) {
	const input = e.target;
	const files = input.files;

	const output = document.querySelector('#output');
	empty(output);

	const progress = document.querySelector('#pgn_progress');
	progress.value = '';

	const allPGNs = [];
	for (const file of files) {
		const text = await new Promise(resolve => {
			const reader = new FileReader();
			reader.addEventListener('load', () => {
			    resolve(reader.result);
  			}, false);
			reader.readAsText(file);
		});

		const pgns = (
			text.split('\n\n')
			.map(pgn => pgn.trim())
			.filter(pgn => pgn)
			.filter(pgn => !pgn.includes('[SetUp "'))
		);
		allPGNs.push(...pgns);
	}

	const chess = new Chess();

	// Determine player
	const playerCandidates = parsePlayers(allPGNs[0]);
	let playerName;
	for (const pgn of allPGNs) {
		chess.load_pgn(pgn);
		const gamePlayers = parsePlayers(pgn);
		if (! playerCandidates.includes(gamePlayers[0])) {
			playerName = gamePlayers[1];
			break;
		} else if (! playerCandidates.includes(gamePlayers[1])) {
			playerName = gamePlayers[0];
			break;
		}
	}
	el(output, 'div', {}, `${allPGNs.length} games, player ${playerName}`);

	// Analyze
	progress.max = allPGNs.length;
	progress.value = 0;
	const stats = {
		twoBishops: 0,
	};
	for (const pgn of allPGNs) {
		const players = parsePlayers(pgn);
		const white = players[0] === playerName;
		loadPgn(chess, pgn);
		const pieceCount = countPieces(chess, white ? 'w': 'b');
		if (pieceCount.b === 2) stats.twoBishops++;

		progress.value += 1;
	}

	el(
		output, 'div', {},
		`Two bishops on the board at the end in ${stats.twoBishops}` +
		` (${percent(stats.twoBishops, allPGNs.length)}) games`);
}

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector('input[name="pgn_file"]').addEventListener('change', analyze);
});
