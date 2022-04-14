let chessboard = Chessboard('board1', getBoardConfig())
/** @type {Chess} */
let chessgame = new Chess()
let speed = [0, 0, 1000]
let results = [0, 0, 0]

async function pause(ms) {
   return await new Promise(resolve => setTimeout(resolve, ms, "Done!"));
}

function getBoardConfig() {
   function preventIllegalStart(source, piece, position, orientation) {
      const legalMoves = chessgame.moves({ verbose: true });
      return legalMoves.some(move => move.from === source)
   }

   function preventIllegalMove(source, target) {
      const legalMoves = chessgame.moves({ verbose: true }).filter(move => move.from === source && move.to === target);

      if (legalMoves.length === 0) return 'snapback';
      else if (legalMoves.length === 1) chessgame.move(legalMoves[0]);
      else if (legalMoves.length > 1) {
         const promotion = prompt("Choose promotion letter: \n\n" + JSON.stringify(legalMoves, null, 3))
         if (chessgame.move({
            from: source,
            to: target,
            promotion
         }) === null) return 'snapback';
      } else throw RangeError("Less than 0 legal moves?");
   }

   return {
      pieceTheme: '{piece}.png',
      draggable: true,
      position: "start",
      onDragStart: preventIllegalStart,
      onDrop: preventIllegalMove,
      onSnapEnd: updateBoard
   }
}

function updateBoard() {
   chessboard.position(chessgame.fen(), false)
   console.clear()
   console.log(chessgame.fen())
   console.log(chessgame.ascii())
}

const games = []
let gameID = 0

updateTextarea();

function adjudicate(game) {
   // If all moves lead to a draw, adjudicate one move early
   let isForcedDraw = true
   let cause = {
      value: null,
      update(val) {
         if (this.value === null) {
            this.value = val
         } else if (this.value !== val) {
            this.value = "multiple"
         }
      }
   }
   for (const move of game.moves({ verbose: true })) {
      game.move(move)
      if (game.in_fifty_move_rule()) {
         cause.update("fifty moves")
      } else if (game.in_stalemate()) {
         cause.update("stalemate")
      } else if (game.insufficient_material()) {
         cause.update("insufficient material")
      } else if (game.in_threefold_repetition()) {
         cause.update("threefold repetition")
      } else {
         isForcedDraw = false
      }
      game.undo()
   }

   if (isForcedDraw) {
      game.set_comment("Draw - dead position - " + cause.value)
      results[1]++
      return true
   }

   // Do not adjudicate as a win if there's a draw
   if (cause.value !== null) {
      return false
   }

   // Various tablebase wins
   // random_move draws so many of these wins
   const bPieces = { count: 0 }
   const wPieces = { count: 0 }
   for (const [i, row] of game.board().entries()) {
      for (const [j, square] of row.entries()) {
         if (square !== null) {
            const pieceType = square.type === 'b'
               ? (i + j) & 1 ? 'db' : 'lb'
               : square.type
            if (square.color === 'b') {
               if (pieceType !== 'k') {bPieces.count++}
               bPieces[pieceType] = pieceType in bPieces ? bPieces[pieceType] + 1 : 1
            }
            if (square.color === 'w') {
               if (pieceType !== 'k') {wPieces.count++}
               wPieces[pieceType] = pieceType in wPieces ? wPieces[pieceType] + 1 : 1
            }
         }
      }
   }

   const [worse, better] = bPieces.count < wPieces.count ? [bPieces, wPieces] : [wPieces, bPieces]
   if (worse.count === 0) {
      if (
         better.r ||
         better.q ||
         better.db && better.n ||
         better.db && better.lb ||
         better.lb && better.n ||
         better.n >= 3 ||
         better.p >= 2
      ) {
         game.set_comment(
            (
               worse === wPieces ? "Black wins" : "White wins"
            ) + " by adjudication"
         )
         results[better === bPieces ? 2 : 0]++
         return true
      }
   }

   return false
}

async function playGame() {
   // Opening
//    for (let i = 0; i < 10; i++) {
//       const moves = chessgame.moves().filter(move => !move.includes("#"))
//       const move = moves[Math.floor(Math.random() * moves.length)]
//       chessgame.move(move)
//    }

   while (true) {
      doMove();
      displayPosition()
      await pause(speed[0]);

      if (chessgame.game_over()) {
         break
      }

      if (adjudicate(chessgame)) {
         await pause(speed[2]);
         return
      }
   }

   if (chessgame.in_stalemate() || chessgame.in_checkmate() || chessgame.in_threefold_repetition()) {
      await pause(speed[2]);
   } else {
      await pause(speed[1]);
   }
   
   if (chessgame.in_checkmate()) {
      if (chessgame.turn() === chessgame.WHITE) {
         results[2]++
      } else {
         results[0]++
      }
   } else {
      results[1]++
   }

   return;
}

async function processGame() {
   chessgame.header("White", `random_move`);
   chessgame.header("Black", `random_move`);

   await playGame();

   updateTextarea();
   gameID++;
   games.push(chessgame.pgn());
   chessgame.reset();
}

/* async */ function run () {
   return processGame()
}

async function allTheTime() {
   await run()
   allTheTime()
}

document.getElementById('start').onclick = run
document.getElementById('forever').onclick = allTheTime

function updateTextarea() {
   document.getElementById('info').value = chessgame.pgn()
   document.getElementById('info2').value = `WDL: ${results.join('-')}`
}


function doMove(output) {
   const moves = chessgame.moves();
   chessgame.move(moves[Math.floor(Math.random() * moves.length)])
}

function displayPosition () {
   chessboard.position(chessgame.fen(), false)
   updateTextarea()
}
