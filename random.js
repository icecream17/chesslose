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

async function playGame() {
   // Opening
//    for (let i = 0; i < 10; i++) {
//       const moves = chessgame.moves().filter(move => !move.includes("#"))
//       const move = moves[Math.floor(Math.random() * moves.length)]
//       chessgame.move(move)
//    }

   while (!chessgame.game_over()) {
      doMove();
      displayPosition()
      await pause(speed[0]);
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
