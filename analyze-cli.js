#!/usr/bin/env node
'use strict';

const assert = require('assert').strict;
const argparse = require('argparse');
const cliProgress = require('cli-progress');
const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');


const {Chess} = require('./chess.js');

const CHESSCOM_API_BASE = 'https://api.chess.com/pub/';
const STANDARD_SETUP = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const CACHE_DIR = path.join(__dirname, 'cache');


async function cachedFetchFunc(url) {
	const hash = crypto.createHash('sha256').update(url).digest('hex');
	const cacheFile = path.join(CACHE_DIR, hash + '.json');

	try {
		const rawData = await fs.promises.readFile(cacheFile, {encoding: 'utf-8'});
		return {
			status: 200,
			json: (async() => {
				return JSON.parse(rawData);
			}),
		};
	} catch (e) {
		; // Ignore
	}

	const response = await fetch(url);
	if (response.status !== 200) {
		throw new Error(`GET ${url} failed with HTTP ${response.status}`);
	}
	const textData = await response.text();
	await fs.promises.mkdir(CACHE_DIR, { recursive: true })
	fs.promises.writeFile(cacheFile, textData, {encoding: 'utf-8'});

	return {
		status: 200,
		json: (async() => {
			return JSON.parse(textData);
		}),
	};
}

function percent(count, totalCount) {
	const res = +(count * 100 / totalCount).toFixed(1);
	return `${res}%`;
}

function parsePlayers(pgn) {
	const white_m = /\[White "([^"]*)"\]/.exec(pgn);
	const black_m = /\[Black "([^"]*)"\]/.exec(pgn);
	if (!white_m || !black_m) {
		throw new Error(
			'Could not find player names: Not a game PGN? ' + JSON.stringify(pgn.slice(0, 1000)));
	}
	return [white_m[1], black_m[1]];
}

function guessPlayer(pgns) {
	assert(pgns.length > 1);
	const playerCandidates = parsePlayers(pgns[0]);
	let playerName;
	const chess = new Chess();
	for (const pgn of pgns) {
		chess.load_pgn(pgn);
		const gamePlayers = parsePlayers(pgn);
		if (! playerCandidates.includes(gamePlayers[0])) {
			return gamePlayers[1];
		} else if (! playerCandidates.includes(gamePlayers[1])) {
			return gamePlayers[0];
		}
	}
	throw new Error('Could not determine player');
}

function countPieces(chess, pgn, playerColor) {
	let corePgnIndex = pgn.search(/\r?\n\s*?\r?\n/);
	if (corePgnIndex < 0) corePgnIndex = 0;
	const corePgn = pgn.substring(corePgnIndex).trim();

	const r = chess.load_pgn(corePgn, {});
	if (!r) {
		throw new Error(`Failed to load PGN ${JSON.stringify(pgn)}`);
	}
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


async function loadChessCom(fetchFunc, playerName, ratedOnly) {
	const archiveUrl = `${CHESSCOM_API_BASE}player/${playerName}/games/archives`;

	const progress = new cliProgress.SingleBar({
		format: `Downloading games of ${playerName} from chess.com {bar} {percentage}% ETA {eta_formatted}`,
		clearOnComplete: true,
	}, cliProgress.Presets.shades_classic);

	const response = await fetchFunc(archiveUrl);
	assert.equal(response.status, 200);
	const {archives} = await response.json();

	progress.start(archives.length, 0);
	const pgns = [];
	for (const monthUrl of archives) {
		const monthResponse = await fetchFunc(monthUrl);
		assert.equal(response.status, 200);
		const {games} = await monthResponse.json();

		for (const game of games) {
			if (game.rules !== 'chess') continue;
			if (game.initial_setup !== STANDARD_SETUP) continue;
			if (ratedOnly && !game.rated) continue;
			pgns.push(game.pgn);
		}
		progress.increment();
	}
	progress.stop();
	return pgns;
}

async function main() {
	const parser = new argparse.ArgumentParser({description: 'Download&analyze chess games'});
	parser.add_argument('-C', '--cache', {action: 'store_true', help: 'Use cache for downloads'});
	parser.add_argument('-c', '--chesscom', {metavar: 'USERNAME', help: 'Download games from chess.com'});
	parser.add_argument('--rated-only', {action: 'store_true', help: 'Only consider rated games'});
	parser.add_argument('--exclude-bullet', {action: 'store_true', help: 'Exclude bullet games'});
	parser.add_argument('--short', {action: 'store_true', help: 'Short output'});
	parser.add_argument('-r', '--read-pgn', {
		nargs: '*',
		metavar: 'FILE', help: 'Read downloaded PGNs to the specified file'
	});
	parser.add_argument('-w', '--write-pgn', {
		metavar: 'FILE', help: 'Write downloaded PGNs to the specified file'
	});
	const args = parser.parse_args();

	if (args.chesscom && args.read_pgn) {
		parser.error('Can only have one of -c/--chesscom -r/--read-pgn');
	}

	const fetchFunc = args.cache ? cachedFetchFunc : fetch;

	let pgns;
	let playerName;
	if (args.chesscom) {
		pgns = await loadChessCom(fetchFunc, args.chesscom, args.rated_only);
		playerName = args.chesscom;
	} else if (args.read_pgn) {
		assert(!args.rated_only, '--rated-only not supported with --read-pgn');
		pgns = [];

		for (const fileName of args.read_pgn) {
			const hugePgnStr = await fs.promises.readFile(fileName, {encoding: 'utf8'});
			const filePgns = (
				hugePgnStr.split(/(?:\r?\n){3}/)
				.map(pgn => pgn.trim())
				.filter(pgn => pgn)
				.filter(pgn => !pgn.includes('[SetUp "'))
			);
			pgns.push(...filePgns);
		}

		playerName = guessPlayer(pgns);
	} else {
		parser.error('Nowhere to load games from. Use --chesscom or --read-pgn');
	}

	if (args.exclude_bullet) {
		pgns = pgns.filter(pgn => {
			const m = /TimeControl "([^"]+)"/.exec(pgn);
			assert(m);
			const timeControlString = m[1];
			const tc_m = /^([0-9]+)(?:\/[0-9]+)?(?:\+[0-9]+)?$/.exec(timeControlString);
			assert(tc_m, `Cannot find base time control in ${timeControlString}`);
			const base = parseInt(tc_m[1]);
			return base >= 3 * 60;
		});
	}

	if (args.write_pgn) {
		await fs.promises.writeFile(args.write_pgn, pgns.join('\n\n'), {encoding: 'utf8'});
	}

	if (!args.short) {
		console.log(`${pgns.length} games of ${playerName}`);
	}

	// Analyze
	const stats = {
		twoBishops: 0,
	};
	const chess = new Chess();
	for (const pgn of pgns) {
		const players = parsePlayers(pgn);
		const white = players[0] === playerName;
		const pieceCount = countPieces(chess, pgn, white ? 'w': 'b');
		if (pieceCount.b === 2) stats.twoBishops++;
	}

	if (args.short) {
		console.log(`${playerName}: ${percent(stats.twoBishops, pgns.length)}`);
	} else {
		console.log(
			`Two bishops on the board at the end in ${stats.twoBishops}` +
			` (${percent(stats.twoBishops, pgns.length)}) games`);
	}
}


if (require.main === module) {
    (async () => {
        try {
            await main();
        } catch (e) {
            console.error(e.stack); // eslint-disable-line no-console
            process.exit(2);
        }
    })();
}
