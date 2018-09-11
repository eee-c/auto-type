// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

let currentChangeNum = 0;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "auto-type" is now active!');

    let disposable = vscode.commands.registerCommand('extension.resetCodeScript', function () {
      currentChangeNum = 0;
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

      const config = ws.getConfiguration('auto-type');
      let changes = config.get('changes');

      if (currentChangeNum >= changes.length) {
        vscode.window.showInformationMessage('No more changes.');
        return;
      }

      let change = changes[currentChangeNum];
      currentChangeNum += 1;

      const files = [
        '/home/chris/repos/your-first-pwa/index.html',
        '/home/chris/repos/your-first-pwa/scripts/app.js',
        '/home/chris/repos/your-first-pwa/service-worker.js',
      ];

      let docPromises = files.map(function(file){
        return ws.openTextDocument(file).
                  then(function(doc){
                    vscode.window.showTextDocument(doc, {preview: false});
                   });
      });

      Promise.all(docPromises).then(function(){
        let docs = ws.textDocuments;

        let changeDoc = docs.find(function(d){ return d.fileName.indexOf(change.file) > -1 });

        vscode.window.showTextDocument(changeDoc).then(function(){

            let range = changeDoc.lineAt(change.line).range;
            vscode.window.activeTextEditor.selection =  new vscode.Selection(range.start, range.end);
            vscode.window.activeTextEditor.revealRange(range, 2);

            let pos = new vscode.Position(change.line, 0);
            var changeText = typeof(change.text) == 'string' ? change.text : change.text.join('');
            type(changeText, pos);
          });
      });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function type(text, pos) {
  if (!text) return;
  if (text.length == 0) return;

  let editor = vscode.window.activeTextEditor;

  var char = text.substring(0, 1);
  if (char == '↓') {
    pos = new vscode.Position(pos.line + 1, 0);
    char = '';
  }
  if (char == '↑') {
    pos = new vscode.Position(pos.line - 1, 0);
    char = '';
  }
  if (char == '→') {
    pos = new vscode.Position(pos.line, pos.character + 1);
    char = '';
  }
  if (char == '←') { char = ''; }
  //if (char == '⌫') { char = ''; }

  if (char == "\n") {
    pos = new vscode.Position(pos.line + 1, 0);
  }

  editor.edit(function(editBuilder) {
    if (char != '⌫') {
      editBuilder.insert(pos, char);
    }
    else {
      let pos0 = new vscode.Position(pos.line, pos.character - 1);
      let selection = new vscode.Selection(pos0, pos);
      editBuilder.delete(selection);
      pos = pos0;
    }

    var newSelection = new vscode.Selection(pos, pos);
    editor.selection = newSelection;
  }).then(function()  {
    var delay = 5 + 10*Math.random();
    var _p = new vscode.Position(pos.line, char.length + pos.character);
    setTimeout(function(){ type(text.substring(1, text.length), _p); }, delay);
  });
}


// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;