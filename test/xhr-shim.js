// XHR shim for node

const fs = require("fs");

function XHR() {}

XHR.prototype.open = function(type, script) {
  this.script = script;
};

XHR.prototype.send = function() {
  const that = this;
  process.nextTick(() => {
    that.readyState = 2;
    that.onreadystatechange();
    process.nextTick(() => {
      that.readyState = 4;
      if (fs.existsSync(that.script)) {
        that.responseText = fs.readFileSync(that.script, "utf-8");
        that.status = 200;
      } else {
        that.status = 404;
      }
      that.onreadystatechange();
    });
  });
};

module.exports = XHR;
