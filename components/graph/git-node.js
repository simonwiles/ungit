var ko = require('knockout');
var components = require('ungit-components');
var GitRefViewModel = require('./git-ref');
var Selectable = require('./selectable');

var GitNodeViewModel = function(graph, logEntry, index) {
  var self = this;
  Selectable.call(this, graph);
  this.graph = graph;
  this.logEntry = logEntry;
  this.title = ko.observable(this.logEntry.message.split('\n')[0]);
  this.parents = ko.observable(this.logEntry.parents || []);
  this.commitTime = ko.observable(this.logEntry.commitDate);
  this.index = ko.observable(index ? undefined : index);
  this.color = ko.observable();
  this.ideologicalBranch = ko.observable();
  this.ideologicalBranch.subscribe(function(value) {
    self.color(value ? value.color : '#666');
  });
  this.remoteTags = ko.observable([]);
  this.branchesAndLocalTags = ko.observableArray();
  if (this.logEntry.refs) {
    var refVMs = this.logEntry.refs.map(function(ref) {
      var refViewModel = self.getRef(ref);
      refViewModel.node(self);
      return refViewModel;
    });
    this.branchesAndLocalTags(refVMs);
  }
  this.refs = ko.computed(function() {
    var rs = self.branchesAndLocalTags().concat(self.remoteTags());
    rs.sort(function(a, b) {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return a.refName < b.refName ? -1 : 1;
    });
    return rs;
  });
  this.commitComponent = components.create('commit', {
    sha1: logEntry.sha1,
    repoPath: this.graph.repoPath(),
    server: this.graph.server
  });
  this.commitComponent.setData(this.logEntry);
  
  this.ancestorOfHEAD = ko.observable(false);
  this.nodeIsMousehover = ko.observable(false);
  this.nodeIsMousehover.subscribe(function(value) {
    self.commitComponent.nodeIsMousehover(value);
  });
  this.commitContainerVisible = ko.computed(function() {
    return self.ancestorOfHEAD() || self.nodeIsMousehover() || self.selected();
  });
  this.highlighted = ko.computed(function() {
    return self.nodeIsMousehover() || self.selected();
  });
  this.highlighted.subscribe(function(value) {
    self.commitComponent.highlighted(value);
  });
  this.selected.subscribe(function(value) {
    self.commitComponent.selected(value);
  });
  // These are split up like this because branches and local tags can be found in the git log,
  // whereas remote tags needs to be fetched with another command (which is much slower)
  this.branchesAndLocalTags = ko.observable([]);
  this.remoteTags = ko.observable([]);
  this.branches = ko.computed(function() {
    return self.refs().filter(function(r) { return r.isBranch; });
  });
  this.tags = ko.computed(function() {
    return self.refs().filter(function(r) { return r.isTag; });
  });
  this.showNewRefAction = ko.computed(function() {
    return !graph.currentActionContext();
  });
  this.newBranchName = ko.observable();
  this.newBranchNameHasFocus = ko.observable(true);
  this.newBranchNameHasFocus.subscribe(function(newValue) {
    if (!newValue) {
      // Small timeout because in ff the form is hidden before the submit click event is registered otherwise
      setTimeout(function() {
        self.branchingFormVisible(false);
      }, 200);
    }
  });
  this.branchingFormVisible = ko.observable(false);
  this.canCreateRef = ko.computed(function() {
    return self.newBranchName() && self.newBranchName().trim() && self.newBranchName().indexOf(' ') == -1;
  });
  this.branchOrder = ko.observable();
  this.aboveNode = ko.observable();
  
  this.r = ko.computed(function() {
    return self.ancestorOfHEAD() ? 30 : 15;
  });
  
  this.cx = ko.computed(function() {
    return self.ancestorOfHEAD() ? 613 : 613 + (90 * self.branchOrder());
  });
  
  this.cy = ko.computed(function() {
    if (self.aboveNode() && self.aboveNode().selected()) {
      return self.aboveNode().cy() + self.aboveNode().commitComponent.element().offsetHeight + 30;
    }
    
    if (self.ancestorOfHEAD()) {
      if (!self.aboveNode()) {
        return 120;
      } else if (self.aboveNode().ancestorOfHEAD()) {
        return self.aboveNode().cy() + 120;
      } else {
        return self.aboveNode().cy() + 60;
      }
    } else {
      return self.aboveNode() ? self.aboveNode().cy() + 60 : 120;
    }
  });
}
module.exports = GitNodeViewModel;

GitNodeViewModel.prototype.click = function() {
  
}

GitNodeViewModel.prototype.getRef = function(ref) {
  var refViewModel = this.graph.refsByRefName[ref];
  if (!refViewModel) {
    refViewModel = this.graph.refsByRefName[ref] = new GitRefViewModel(ref, this.graph);
    this.graph.refs.push(refViewModel);
  }
  return refViewModel;
}
