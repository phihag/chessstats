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

const {decodePgn} = require('./chesscom.js');
const {cachedFetch, shuffleArray} = require('./utils.js');


const ENTRIES = [
	'b https://www.chess.com/analysis/game/live/11908460993',
	'b https://www.chess.com/analysis/game/live/29794229927',
	'w https://www.chess.com/analysis/game/live/33151211337',
	'b https://www.chess.com/analysis/game/live/34203044315',
	'w https://www.chess.com/analysis/game/live/34538415337',
	'b https://www.chess.com/analysis/game/live/24890459011',
	'w https://www.chess.com/analysis/game/live/5766516492',
];

async function getPgn(args, entryString) {
	const [color, url] = entryString.split(' ');

	const gameIdMatch = /([0-9]+)/.exec(url);
	assert(gameIdMatch);
	const gameId = gameIdMatch[1];
	const gameUrl = `https://www.chess.com/callback/live/game/${gameId}`;
	const response = await cachedFetch(gameUrl);
	assert.equal(response.status, 200);
	const data = await response.json();

	const pgnHeaders = {
		Result: data.game.pgnHeaders.Result,
	};
	if (color === 'w') {
		pgnHeaders.White = args.hero_name;
		pgnHeaders.Black = args.opponent_name;
	} else {
		assert.equal(color, 'b');
		pgnHeaders.White = args.opponent_name;
		pgnHeaders.Black = args.hero_name;
	}
	pgnHeaders.Event = url;
	const pgn = decodePgn(pgnHeaders, data.game.moveList);
	return pgn;
}

async function main() {
	const parser = new argparse.ArgumentParser({description: 'Write PGN for Guess the Elo'});
	parser.add_argument('--opponent-name', {default: 'Opponent'});
	parser.add_argument('--hero-name', {default: 'KDLearns Discord member'});
	const args = parser.parse_args();

	const pgns = await Promise.all(ENTRIES.map(entry => getPgn(args, entry)));
	shuffleArray(pgns);
	console.log(pgns.join('\n\n\n'));
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
