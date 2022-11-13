import { useState } from "react";
import { v4 } from "uuid";
import ts from "typescript";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";

const Nodes = ({ nodes, src }: { src: ts.SourceFile; nodes: ts.Node[] }) => (
  <>
    <ul className="pl-2">
      {nodes
        .map((n) => ({
          ...n,
          id: v4(),
          children: n.getChildren(src),
          kindName: ts.SyntaxKind[n.kind],
        }))
        .map((n) => (
          <li key={n.id}>
            <div>{n.kindName}</div>
            <Nodes src={src} nodes={n.children}></Nodes>
          </li>
        ))}
    </ul>
  </>
);

function App() {
  const [code, setCode] = useState(`


  // Parameters may be declared in a variety of syntactic forms
  /**
   * @param {string}  p1 - A string param.
   * @param {string=} p2 - An optional param (Google Closure syntax)
   * @param {string} [p3] - Another optional param (JSDoc syntax).
   * @param {string} [p4="test"] - An optional param with a default value
   * @returns {string} This is the result
   */
  export const GetSomething = () => {

  };

  export const GetAnotherThing = () => {

  };

  let g = "";

  export function AST() {

  }`);
  const [src, setSrc] = useState<any>(null);
  const [exports, setExports] = useState<any>([]);

  const transformer =
    <T extends ts.Node>(context: ts.TransformationContext) =>
    (rootNode: T) => {
      function visit(node: ts.Node): ts.Node {
        node = ts.visitEachChild(node, visit, context);
        if (node.kind === ts.SyntaxKind.VariableDeclaration) {
          const varDec = node as ts.VariableDeclaration;

          console.log(ts.getCombinedModifierFlags(varDec));
        }
        return node;
      }
      return ts.visitNode(rootNode, visit);
    };

  const onCodeChange = (value: string | undefined) => {
    if (!value) return;

    const src = ts.createSourceFile("DSL.ts", value, ts.ScriptTarget.ES2022);
    const transformed = ts.transform(src, [transformer]);
    const printer: ts.Printer = ts.createPrinter();
    // console.log(printer.printNode(ts.EmitHint.SourceFile,transformed.transformed[0], src))

    var root = src
      .getChildren()
      .find((n) => n.kind === ts.SyntaxKind.SyntaxList);
    if (root === undefined) return;

    const varExports = src.statements
      .filter(
        (st: ts.Node): st is ts.VariableStatement =>
          st.kind === ts.SyntaxKind.VariableStatement
      )
      .filter(
        (vst) =>
          ts.getCombinedModifierFlags(vst as any) & ts.ModifierFlags.Export
      )
      .flatMap((vst) => vst.declarationList.declarations)
      .filter((dec) => dec.initializer?.kind === ts.SyntaxKind.ArrowFunction)
      .map((dec) => ({
        name: (dec.name as any).escapedText,
        id: v4(),
        params: (dec.initializer as ts.ArrowFunction).parameters.map((p) => ({
          id: v4(),
          type: p.type?.getText(src),
          name: p.name.getText(src),
        })),
      }));

    const funcExports = src.statements
      .filter(
        (st: ts.Node): st is ts.FunctionDeclaration =>
          st.kind === ts.SyntaxKind.FunctionDeclaration
      )
      .filter(
        (vst) =>
          ts.getCombinedModifierFlags(vst as any) & ts.ModifierFlags.Export
      )
      .map((dec) => ({
        name: dec.name?.text ?? "unknown",
        id: v4(),
        params: dec.parameters.map((p) => ({
          id: v4(),
          type: p.type?.getText(src),
          name: p.name.getText(src),
        })),
      }));

    setSrc(src);
    setExports(varExports.concat(funcExports));
    //nodes.map(n => n.)
  };

  return (
    <section className="w-full flex flex-col h-screen">
      <nav className="h-24 bg-slate-500 text-white p-4 flex items-center">
        <h1 className="text-3xl">Monaco Test</h1>
      </nav>
      <div className="justify-self-stretch flex flex-row ">
        <div className="w-1/2">
          <Editor
            height="90vh"
            defaultLanguage="typescript"
            defaultValue={code}
            onChange={onCodeChange}
          />
        </div>
        <div className="p-4">
          <h3>Exports</h3>
          <ul className="pl-4">
            {exports.map((e) => (
              <li key={e.id}>
                {e.name}
                <ul className="pl-4">
                  {e.params.map((p) => (
                    <li key={p.id}>{`${p.name} - ${p.type}`}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default App;
