let chessboard = Chessboard('board1', getBoardConfig())
/** @type {Chess} */
let chessgame = new Chess()
let speed = [0, 0, 500]
let NUMBER_OF_NETS = 5;

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

/** @type {Net[]} */
let nets = [];
for (let i = 0; i < NUMBER_OF_NETS; i++) nets.push(new Net(i))

let round = 0;
let games = [];
let gameID = 0;
let playerIDs = [0, 1];
globalThis.nets = nets;
updateTextarea();

async function playGame() {
   // Opening
   for (let i = 0; i < 10; i++) {
      const moves = chessgame.moves().filter(move => !move.includes("#"))
      const move = moves[Math.floor(Math.random() * moves.length)]
      chessgame.move(move)
   }

   while (!chessgame.game_over()) {
      const input = getInput();
      if (chessgame.turn() === chessgame.WHITE) {
         const output = nets[playerIDs[0]].run(input)
         doMove(output);
      } else {
         const output = nets[playerIDs[1]].run(input)
         doMove(output);
      }

      displayPosition()
      await pause(speed[0]);
   }

   if (chessgame.in_checkmate()) {
      await pause(speed[2]);
   } else {
      await pause(speed[1]);
   }

   return;
}

document.getElementById('start').onclick = async function () {
   let newBots = [];
   if (round !== 0) {
      let totalscore = nets.reduce((totalrating, currentnet) => totalrating + currentnet.rating, 0);
      let goodnets = nets.filter(net => net.rating > totalscore / nets.length);
      const newnet = new Net(NUMBER_OF_NETS)
      for (const goodnet of goodnets) {
         if (Math.random() < Math.PI / goodnets.length) {
            const randindex = Math.floor(Math.random() * (goodnet.layers.length - 1)) + 1;
            for (let i = randindex; i < goodnet.layers.length - 1; i++) {
               newnet.layers[i] = goodnet.layers[i].copy(newnet)
            }
            for (const layer of newnet.layers) {
               if (layer.index !== 0) {
                  layer.fixReceivingWeights()
               }
            }
            if (newnet.layers[newnet.layers.length - 1].neurons.length !== 3) {
               newnet.layers.push(new Layer(newnet, newnet.layers.length, 3));
            }
         }
      }

      nets.push(newnet)
      newBots.push(newnet.id)
      playerIDs = [newnet.id, 0]
      NUMBER_OF_NETS++
   } else {
      newBots = nets.map((_net, index) => index);
   }

   while (round === 0) {
      chessgame.header("White", `Net [object Net] ${playerIDs[0]}`);
      chessgame.header("Black", `Net [object Net] ${playerIDs[1]}`);

      await playGame();

      if (chessgame.in_draw()) {
         nets[playerIDs[0]].updateScore(playerIDs[1], 0);
         nets[playerIDs[1]].updateScore(playerIDs[0], 0);
      } else if (chessgame.turn() === chessgame.WHITE) {
         nets[playerIDs[0]].updateScore(playerIDs[1], 7); // black earns 1 because chesslose
         nets[playerIDs[1]].updateScore(playerIDs[0], 3);
      } else {
         nets[playerIDs[0]].updateScore(playerIDs[1], 3);
         nets[playerIDs[1]].updateScore(playerIDs[0], 7);
      }

      playerIDs[1]++;
      gameID++;

      if (playerIDs[1] === NUMBER_OF_NETS) {
         playerIDs[0]++;
         playerIDs[1] = 0;
      }

      if (playerIDs[0] === playerIDs[1]) playerIDs[1]++
      if (playerIDs[1] === NUMBER_OF_NETS) {
         playerIDs[1] = NUMBER_OF_NETS - 1;
         updateTextarea();
         games.push(chessgame.pgn());
         chessgame.reset();
         break;
      }

      updateTextarea();
      games.push(chessgame.pgn());
      chessgame.reset();
   }

   let done = [];
   for (let nonNew = nets.map((net, index) => index).filter(index => !newBots.includes(index)); round !== 0;) {
      chessgame.header("White", `Net [object Net] ${playerIDs[0]}`);
      chessgame.header("Black", `Net [object Net] ${playerIDs[1]}`);

      await playGame();

      if (chessgame.in_draw()) {
         nets[playerIDs[0]].updateScore(playerIDs[1], 0);
         nets[playerIDs[1]].updateScore(playerIDs[0], 0);
      } else if (chessgame.turn() === chessgame.WHITE) {
         nets[playerIDs[0]].updateScore(playerIDs[1], 7); // black earns 1 because chesslose
         nets[playerIDs[1]].updateScore(playerIDs[0], 3);
      } else {
         nets[playerIDs[0]].updateScore(playerIDs[1], 3);
         nets[playerIDs[1]].updateScore(playerIDs[0], 7);
      }

      gameID++;
      updateTextarea();

      if (nonNew.includes(playerIDs[0])) {
         if (playerIDs[1] === newBots[newBots.length - 1]) {
            if (playerIDs[0] === nonNew[nonNew.length - 1]) {
               updateTextarea();
               games.push(chessgame.pgn());
               chessgame.reset();
               break;
            }
            playerIDs[0] = nonNew[nonNew.indexOf(playerIDs[0]) + 1]
            playerIDs[1] = newBots[0]
         } else {
            playerIDs[1] = newBots[newBots.indexOf(playerIDs[1]) + 1]
         }
      } else {
         playerIDs[1]++;
         if (playerIDs[0] === playerIDs[1]) playerIDs[1]++;
         if (playerIDs[1] >= nets.length) {
            if (playerIDs[0] === newBots[newBots.length - 1]) {
               playerIDs = [nonNew[0], newBots[0]]
            } else {
               playerIDs[0] = newBots[newBots.indexOf(playerIDs[0]) + 1]
               playerIDs[1] = 0
            }
         }
      }

      games.push(chessgame.pgn());
      chessgame.reset();
   }

   round++;
}

async function allTheTime() {
   await document.getElementById('start').onclick()
   allTheTime()
}

function updateTextarea() {
   document.getElementById('info').value =
`Round ${round}
Game #${gameID}
Net ${playerIDs[0]} vs Net ${playerIDs[1]}

0: ${nets[playerIDs[0]].toString()}
1: ${nets[playerIDs[1]].toString()}

${chessgame.pgn()}`

   document.getElementById('info2').value = nets.map(
      net => `#${net.id} (${net.rating}) -> ${net.totalScore} -> ${net.score.map((thing) => thing?.[0])}`
   ).join('\n')
}

function getInput() {
   let input = []
   for (const row of chessgame.board()) {
      for (const cell of row) {
         if (cell === null) {
            input.push(0); continue;
         }

         let value = 0;
         if (cell.type === chessgame.PAWN) value = 1 / 6;
         if (cell.type === chessgame.KNIGHT) value = 2 / 6;
         if (cell.type === chessgame.BISHOP) value = 3 / 6;
         if (cell.type === chessgame.ROOK) value = 4 / 6;
         if (cell.type === chessgame.QUEEN) value = 5 / 6;
         if (cell.type === chessgame.KING) value = 1;

         if (cell.color === chessgame.BLACK) value *= -1;
         input.push(value)
      }
   }

   input.push(chessgame.fen().split(' ')[4] / 100);

   return input
}

function doMove(output) {
   function toNumber(movePart) {
      return (("abcdefgh".indexOf(movePart[0]) * 8) + Number(movePart[1]) - 32) / 64
   }

   function promotionNumber(val) {
      if (val === undefined) return 0;
      else if (val === 'n') return -1;
      else if (val === 'b') return -0.5;
      else if (val === 'r') return 0.5;
      else if (val === 'q') return 1;
   }

   let moves = chessgame.moves({ verbose: true });
   let movesToNumber = []

   for (const move of moves) {
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
}

function displayPosition () {
   chessboard.position(chessgame.fen(), false)
   updateTextarea()
}

