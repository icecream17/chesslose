let chessboard = Chessboard('board1', getBoardConfig())
let chessgame = new Chess()

// for async functions
async function pause(ms) {
   return await new Promise(resolve => setTimeout(resolve, ms, "Done!"));
}

function getBoardConfig() {
   function preventIllegalStart(source, piece, position, orientation) {
      let legalMoves = chessgame.moves({ verbose: true });
      return legalMoves.some(move => move.from === source)
   }

   function preventIllegalMove(source, target) {
      let legalMoves = chessgame.moves({ verbose: true }).filter(move => move.from === source && move.to === target);

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

function updateBoard () {
   chessboard.position(chessgame.fen(), false)
   console.clear()
   console.log(chessgame.fen())
   console.log(chessgame.ascii())
}

let nets = [];
for (let i = 0; i < 100; i++) nets.push(new Net(i))

let round = 0;
let gameID = 0;
let playerIDs = [0, 1];
globalThis.nets = nets;
updateTextarea();

document.getElementById('start').onclick = async function () {
   if (round !== 0) {
      let worst = [Infinity, 0]
      for (let i = 0; i < bots.length; i++) {
         if (bots[i].score === undefined) throw TypeError("undefineddd");
         else if (bots[i].score < worst[0]) worst = [bots[i].score, i]
      }
      
      console.log(`Replaced Bot #${i} - ${bots[i].toString()}`)
      bots[i] = new Net(i);
   }
   
   while (true) {
      while (!chessgame.game_over()) {
         let input = await getInput();
         if (chessgame.turn() === chessgame.WHITE) {
            let output = await nets[playerIDs[0]].run(input)
            await doMove(output);
         } else {
            let output = await nets[playerIDs[1]].run(input)
            await doMove(output);
         }

         await updateTextarea();
         await pause(1000);
      }

      await pause(5000);
      if (chessgame.in_draw()) {
         nets[playerIDs[0]].score[playerIDs[1]] = 0.5;
         nets[playerIDs[1]].score[playerIDs[0]] = 0.5;
      } else if (chessgame.turn() === chessgame.WHITE) {
         nets[playerIDs[0]].score[playerIDs[1]] = 1;
         nets[playerIDs[1]].score[playerIDs[0]] = 0;
      } else {
         nets[playerIDs[0]].score[playerIDs[1]] = 0;
         nets[playerIDs[1]].score[playerIDs[0]] = 1;
      }

      playerIDs[1]++;
      gameID++;

      if (playerIDs[1] === 100) {
         playerIDs[0]++;
         playerIDs[1] = 0;
      }

      if (playerIDs[0] === playerIDs[1]) playerIDs[1]++
      if (playerIDs[1] === 100) break;

      await updateTextarea();
      chessgame.reset();
   }

   round++;
}

function updateTextarea () {
   document.getElementById('info').value = `Round ${round}
Game #${gameID}
Net ${playerIDs[0]} vs Net ${playerIDs[1]}

0: ${nets[0].toString()}
1: ${nets[1].toString()}

${chessgame.pgn()}`
}

async function getInput() {
   let input = []
   for (let i of chessgame.board()) {
      for (let j of i) {
         if (j === null) {
            input.push(0); continue;
         }

         let value = 0;
         if (j.type === chessgame.PAWN) value = 1 / 6;
         if (j.type === chessgame.KNIGHT) value = 2 / 6;
         if (j.type === chessgame.BISHOP) value = 3 / 6;
         if (j.type === chessgame.ROOK) value = 4 / 6;
         if (j.type === chessgame.QUEEN) value = 5 / 6;
         if (j.type === chessgame.KING) value = 1;

         if (j.color === chessgame.BLACK) value *= -1;
         input.push(value)
      }
   }

   return input
}

async function doMove(output) {
   function toNumber(movePart) {
      return (("abcdefgh".indexOf(movePart[0]) * 8) + Number(movePart[1]) - 32) / 64
   }

   function promotionNumber (val) {
      if (val === undefined) return 0;
      else if (val === 'n') return -1;
      else if (val === 'b') return -0.5;
      else if (val === 'r') return 0.5;
      else if (val === 'q') return 1;
   }

   let moves = chessgame.moves({ verbose: true });
   let movesToNumber = []

   for (let move of moves) {
      movesToNumber.push([toNumber(move.from), toNumber(move.to), promotionNumber(move?.promotion)])
   }

   let best = [Infinity, moves[0]]
   for (let i = 0; i < movesToNumber.length; i++) {
      let num = movesToNumber[i]

      let cost = 0;
      cost += Math.abs(num[0] - output[0])
      cost += Math.abs(num[1] - output[1])
      cost += 0.01 * Math.abs(num[2] - output[2])

      if (best[0] > cost) {
         best = [cost, moves[i]]
      }
   }

   chessgame.move(best[1])
   chessboard.position(chessgame.fen(), false)

}

