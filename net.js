/**
 * Gets a random integer between minimum inclusive, and maximum exclusive,
 * @param {number} min - The minimum integer possible, inclusive.
 * @param {number} max - The maximum integer possible, exclusive.
 * @returns {number} - A random integer between min (inclusive) and max (exclusive)
 * @example randomInteger(18, 29) // 23
 * randomInteger(32879, 893) // 28359
 * randomInteger(0.2, -5) // -4
 */
function randomInteger(min, max) {
   min = Math.ceil(min);
   max = Math.floor(max);
   return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

/**
 * Gets a random number between minimum inclusive, and maximum exclusive,
 * @param {number} min - The minimum number possible, inclusive.
 * @param {number} max - The maximum number possible, exclusive.
 * @returns {number} - A random number between min (inclusive) and max (exclusive)
 * @example randomInRange(18, 29) // 18.02358678329
 * randomInRange(32879, 893) // 5952.9056785728
 * randomInRange(0.2, -5) // -4.4368949634 (WARNING: Never above 0)
 */
function randomInRange(min, max) {
   return Math.random() * (max - min) + min;
}

function squishify(value) {
   return Math.tanh(value);
}

Number.prototype.then = function sillyThen(func) {
   func(this.valueOf())
}


globalThis.Neuron = class Neuron {
   #value = randomInRange(-1, 1);
   #bias = randomInRange(-1, 1);

   constructor (nn, layer, indexOfLayer, indexInLayer) {
      this.nn = nn;
      this.layer = layer;
      this.indexOfLayer = indexOfLayer;
      this.indexInLayer = indexInLayer;
   }

   get value () {
      if (this.indexOfLayer === 0) return squishify(this.#value + this.#bias);
      if (this.nn.computed?.[this.indexOfLayer]?.[this.indexInLayer]) return this.#value

      let val = 0
      for (let i = 0; i < this.nn.layers[this.indexOfLayer - 1].neurons.length; i++) {
         val += (
            this.nn.layers[this.indexOfLayer - 1].neurons[i].value *
            this.layer.receivingWeights[i][this.indexInLayer]
         );
      }

      val += this.#bias;
      this.#value = squishify(val)

      if (this.nn.computed?.[this.indexOfLayer] === undefined) this.nn.computed[this.indexOfLayer] = []
      this.nn.computed[this.indexOfLayer][this.indexInLayer] = true;

      return this.#value;
   }

   set value (val) {this.#value = val;}
}

globalThis.Layer = class Layer {
   constructor(nn, index, numNeurons = randomInteger(9, 256)) {
      this.nn = nn;

      /** Index of layer in nn */
      this.index = index;

      this.neurons = [];
      for (let i = 0; i < numNeurons; i++) {
         this.neurons.push(new Neuron(nn, this, index, i))
      }

      this.receivingWeights = null;
      if (index !== 0) {
         this.receivingWeights = [];
         for (let i = 0; i < this.nn.layers[index - 1].length; i++) {
            this.receivingWeights[i] = []

            for (let j = 0; j < this.neurons.length; j++) {
               this.receivingWeights[i].push(randomInRange(-1, 1))
            }
         }
      }
   }

   get length () {return this.neurons.length}
   
   copy(newnn) {
      const layerCopy = Object.create(Layer.prototype)
      layerCopy.nn = newnn
      layerCopy.index = this.index

      layerCopy.neurons = []
      for (let i = 0; i < this.neurons.length; i++) {
         layerCopy.neurons.push(new Neuron(newnn, layerCopy, layerCopy.index, i))
      }

      if (this.receivingWeights === null) {
         layerCopy.receivingWeights = null
      } else {
         layerCopy.receivingWeights = []
         for (let i = 0; i < newnn.layers[layerCopy.index - 1].length; i++) {
            layerCopy.receivingWeights[i] = []

            for (let j = 0; j < layerCopy.neurons.length; j++) {
               layerCopy.receivingWeights[i].push(this.receivingWeights?.[i]?.[j] ?? randomInRange(-1, 1))
            }
         }
      }
      
      return layerCopy
   }

   *[Symbol.iterator]() {
      throw Error("Iterate over the neurons or weights instead of the layer")
   }
}

globalThis.Net = class Net {
   #id = null;
   constructor (id) {
      this.#id = id;
      this.layers = [];

      this.layers.push(new Layer(this, 0, 65)); // 64 squares + half moves
      for (let i = 1; i < randomInteger(3, 7); i++) {
         this.layers.push(new Layer(this, i));
      }

      this.layers.push(new Layer(this, this.layers.length, 3));

      this.lastOut = null
      this.score = [];

      this.computed = [];
   }

   get id () {return this.#id;}
   get totalScore () {return this.score.reduce((accum, curr) => accum + curr[0], 0)}
   get rating () {return this.score.reduce((accum, curr, index) => accum + (curr[0] * nets[index].totalScore), 0)}
   get ranking () {return 1 + nets.filter(net => net.rating > this.rating).length}

   run (...inputs) {
      if (Array.isArray(inputs[0])) inputs = inputs[0]

      for (let i = 0; i < inputs.length; i++) this.layers[0].neurons[i].value = inputs[i];
      this.computed = [];

      let out = []
      for (const outNode of this.layers[this.layers.length - 1].neurons) {
         out.push(outNode.value)
      }

      this.lastOut = out;
      return out;
   }

   updateScore(botIndex, result) {
      this.score[botIndex] ??= [0, 0]
      this.score[botIndex][0] += result;
      this.score[botIndex][1]++;
   }

   toString() {
      return `[object Net] rating: ${this.rating}, rank: ${this.ranking}, score: ${this.totalScore}
x${this.layers.map(layer => layer.length).join()} -> ${this.lastOut}`
   }
}
