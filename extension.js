// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');

let currentPageNum = 0;
var rootDir, scriptDir;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "auto-type" is now active!');

    let disposable = vscode.commands.registerCommand('extension.resetCodeScript', function () {
      currentPageNum = 0;
    });

    context.subscriptions.push(disposable);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    disposable = vscode.commands.registerCommand('extension.playCodeScript', function () {
      // The code you place here will be executed every time your command is executed

      let editor = vscode.window.activeTextEditor;
      if (!editor) return;

      let ws = vscode.workspace;

      rootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
      scriptDir = rootDir + '/.auto-type';

      let scriptPages;
      try {
        scriptPages = loadScript();
      }
      catch (e) {
        vscode.window.showWarningMessage(e);
        return;
      }

      if (currentPageNum >= scriptPages.length) {
        vscode.window.showInformationMessage('No more script pages.');
        return;
      }

      let scriptPage = scriptPages[currentPageNum];
      currentPageNum += 1;

      let files = scriptPages.map(function(p){ return p.file; });

      let docPromises = files.map(function(file){
        let fqfn = (file.indexOf('/') == 0) ? file : rootDir + '/' + file;
        return ws.openTextDocument(fqfn).
                  then(function(doc){
                    vscode.window.showTextDocument(doc, {preview: false});
                  });
      });

      Promise.all(docPromises).then(function(){
        let docs = ws.textDocuments;
        let changeDoc = docs.find(function(d){ return d.fileName.indexOf(scriptPage.file) > -1 });

        vscode.window.showTextDocument(changeDoc).then(function(){
            let range = changeDoc.lineAt(scriptPage.line).range;
            vscode.window.activeTextEditor.selection =  new vscode.Selection(range.start, range.end);
            vscode.window.activeTextEditor.revealRange(range, scriptPage.align);

            let pos = new vscode.Position(scriptPage.line, scriptPage.col);
            var changeText = typeof(scriptPage.content) == 'string' ? scriptPage.content : scriptPage.content.join('');
            type(changeText, pos);
          });
      });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function loadScript() {
  if (!fs.existsSync(scriptDir)) {
    vscode.window.showWarningMessage('The script directory ' + scriptDir + ' does not exist. Nothing for auto-type to do.');
    return [];
  }
  let pages = fs.readdirSync(scriptDir);
  if (!pages.length) {
    vscode.window.showWarningMessage('No script pages found in ' + scriptDir + '. Nothing for auto-type to do.');
    return [];
  }
  return pages.map(function(pageName) {
    return parseScriptPage(pageName, scriptDir);
  });
}

function parseScriptPage(pageName, scriptDir) {
  let pagePath = scriptDir + '/' + pageName;
  let fullContent = fs.readFileSync(pagePath, {encoding: 'utf-8'});
  let parts = fullContent.split(/\n\-\-\-\n/m);

  var frontMatter, content;
  try {
    frontMatter = parseFrontMatter(parts[0]);
    content = parts[1];
  }
  catch (e) {
    throw e + ' in script page ' + pagePath;
  }

  let options = {
    name: pageName,
    path: pagePath,
    content: content,
  };

  for (var prop in frontMatter) {
    options[prop] = frontMatter[prop];
  }

  if (!options.file) throw "Missing file property";
  if (!fs.existsSync(options.file) && !fs.existsSync(scriptDir + '/../' + options.file)) {
    throw "Can't find target file " + options.file;
  }

  return options;
}

function parseFrontMatter(text) {
  let options = text.split("\n")
                    .reduce(
                        function(a, line) {
                          let parts = line.split(/\s*:\s*/);
                          a[parts[0]] = parts[1];
                          return a;
                        },
                        {}
                     );
  if (!options.line) options.line = 1;
  if (!options.col) options.col = 1;

  options.line = parseInt(options.line, 10) - 1;
  options.col = parseInt(options.col, 10) - 1;

  if (!options.align) options.align = 'middle';
  options.align = options.align == 'middle' ? 2 : 3;

  return options;
}

function type(text, pos) {
  if (!text) return;
  if (text.length == 0) return;

  let editor = vscode.window.activeTextEditor;

  var _pos = pos;
  var char = text.substring(0, 1);
  if (char == '↓') {
    _pos = new vscode.Position(pos.line + 1, pos.character);
    char = '';
  }
  if (char == '↑') {
    _pos = new vscode.Position(pos.line - 1, pos.character);
    char = '';
  }
  if (char == '→') {
    _pos = new vscode.Position(pos.line, pos.character + 1);
    char = '';
  }
  if (char == '←') {
    _pos = new vscode.Position(pos.line, pos.character - 1);
    char = '';
  }
  if (char == '⇤') {
    _pos = new vscode.Position(pos.line, 0);
    char = '';
  }
  if (char == '⇥') {
    _pos = editor.document.lineAt(pos.line).range.end;
    char = '';
  }

  editor.edit(function(editBuilder) {
    if (char != '⌫') {
      editBuilder.insert(_pos, char);
    }
    else {
      _pos = new vscode.Position(pos.line, pos.character - 1);
      let selection = new vscode.Selection(_pos, pos);
      editBuilder.delete(selection);
      char = '';
    }

    var newSelection = new vscode.Selection(_pos, _pos);
    if (char == "\n") {
      newSelection = new vscode.Selection(pos, pos);
      _pos = new vscode.Position(pos.line + 1, 0);
      char = '';
    }

    editor.selection = newSelection;
  }).then(function()  {
    var delay = 20 + 80*Math.random();
    if (Math.random() < 0.1) delay += 250;
    var _p = new vscode.Position(_pos.line, char.length + _pos.character);
    setTimeout(function(){ type(text.substring(1, text.length), _p); }, delay);
  });
}

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
