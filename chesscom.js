const assert = require('assert').strict;

const { Chess } = require('./chess.js');

const CHESSCOM_API_BASE = 'https://api.chess.com/pub/';

const SQUARES = {
    'a': 'a1', 'b': 'b1', 'c': 'c1', 'd': 'd1', 'e': 'e1', 'f': 'f1', 'g': 'g1', 'h': 'h1',
    'i': 'a2', 'j': 'b2', 'k': 'c2', 'l': 'd2', 'm': 'e2', 'n': 'f2', 'o': 'g2', 'p': 'h2',
    'q': 'a3', 'r': 'b3', 's': 'c3', 't': 'd3', 'u': 'e3', 'v': 'f3', 'w': 'g3', 'x': 'h3',
    'y': 'a4', 'z': 'b4', 'A': 'c4', 'B': 'd4', 'C': 'e4', 'D': 'f4', 'E': 'g4', 'F': 'h4',
    'G': 'a5', 'H': 'b5', 'I': 'c5', 'J': 'd5', 'K': 'e5', 'L': 'f5', 'M': 'g5', 'N': 'h5',
    'O': 'a6', 'P': 'b6', 'Q': 'c6', 'R': 'd6', 'S': 'e6', 'T': 'f6', 'U': 'g6', 'V': 'h6',
    'W': 'a7', 'X': 'b7', 'Y': 'c7', 'Z': 'd7', '0': 'e7', '1': 'f7', '2': 'g7', '3': 'h7',
    '4': 'a8', '5': 'b8', '6': 'c8', '7': 'd8', '8': 'e8', '9': 'f8', '!': 'g8', '?': 'h8',
};
const PIECES = {
    '~': 'Q', '_': 'R', '^': 'N', '#': 'B', // promotion (pushing)
    '}': 'Q', ']': 'R', ')': 'N', '$': 'B', // promotion & capture (to a higher file)
    '{': 'Q', '[': 'R', '(': 'N', '@': 'B', // promotion & capture (to a lower file)
};
const PROMOTION_HIGHER = '}])$'; // higher file
const PROMOTION_LOWER = '{[(@'; // lower file


function convertMove(chars) {
    let from = SQUARES[chars[0]];
    let to = SQUARES[chars[1]];

    let promotion = PIECES[chars[1]];
    if (promotion) {
        let file = from[0];
        if (PROMOTION_HIGHER.includes(chars[1])) {
            file = String.fromCharCode(file.charCodeAt(0) + 1);
        } else if (PROMOTION_LOWER.includes(chars[1])) {
            file = String.fromCharCode(file.charCodeAt(0) - 1);
        }

        to = '' + file + (from[1] === '7' ? '8' : '1');
    }

    const res = {
        from,
        to,
    };
    if (promotion) {
        res.promotion = promotion.toLowerCase();
    }
    return res;
}

function decodePgn(pgnHeaders, moveList) {
    assert.equal(typeof moveList, 'string');
    assert(moveList.length % 2 == 0);
    const chess = new Chess(pgnHeaders.FEN)

    for (const [k, v] of Object.entries(pgnHeaders)) {
        chess.header(k, v);
    }

    for (let i = 0;i < moveList.length;i += 2) {
        const move = convertMove(moveList.substr(i, 2));
        chess.move(move);
    }

    return chess.pgn();
}

module.exports = {
    CHESSCOM_API_BASE,
    decodePgn,
};
