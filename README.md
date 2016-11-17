# jobQ
Async and parallel execution of jobs, tasks and processes

## Installation
```bash
npm install --save jobQ
```

## Usage
```js
var jobQ = require('jobQ') 

var queue = new JobQueuer({
  process: function(x, callback){
    setTimeout(function() {
      callback(null, x)
    }, 3000)
  },
  source: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  maxProceses: 2
})

queue.start()
```

## Events
```js
var queue = new JobQueuer({
  process: myProcess,
  source: mySource,
  maxProceses: 2
})

queue.on('start', function(){})
queue.on('jobFetch', function(){})
queue.on('jobRun', function(){})
queue.on('jobFinish', function(){})
queue.on('processFinish', function(){})
queue.on('error', function(){})

queue.start()
```

## Source
The following source types are accepted:

* Array
* Array of Promises
* Promise
* Function that returns a Promise
* Function that Return a Value
* Function with Callback

## Process
The following process types are accepted:

* Function that returns a value
* Function that returns a Promise
* Function that executes a Callback