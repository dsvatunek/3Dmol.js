
import { Matrix3 } from "../WebGL";

import { assignBonds } from "./utils/assignBonds";
import { ParserOptionsSpec } from "./ParserOptionsSpec";
import { AtomSpec } from "specs";

/**
 * @param {string}
 *            str
 * @param {ParserOptionsSpec}
 *            options
 * @category Parsers
*/

export function VASP(str: string, options: ParserOptionsSpec = {}) {
  var atoms: any[][] & Record<string, any> = [[]];
  var lattice: Record<string, number | Float32Array> = {};
  const assignbonds =
    options.assignBonds === undefined ? true : options.assignBonds;

  var lines = str.replace(/^\s+/, "").split(/\r?\n/);

  if (lines.length < 3) {
    return atoms;
  }

  if (lines[1].match(/\d+/)) {
    lattice.length = parseFloat(lines[1]);
  } else {
    console.log(
      "Warning: second line of the vasp structure file must be a number"
    );
    return atoms;
  }

  if (lattice.length < 0) {
    console.log(
      "Warning: Vasp implementation for negative lattice lengths is not yet available"
    );
    return atoms;
  }

  lattice.xVec = new Float32Array((lines[2] as any).replace(/^\s+/, "").split(/\s+/));
  lattice.yVec = new Float32Array((lines[3] as any).replace(/^\s+/, "").split(/\s+/));
  lattice.zVec = new Float32Array((lines[4] as any).replace(/^\s+/, "").split(/\s+/));

  var matrix = new Matrix3(
    lattice.xVec[0],
    lattice.xVec[1],
    lattice.xVec[2],
    lattice.yVec[0],
    lattice.yVec[1],
    lattice.yVec[2],
    lattice.zVec[0],
    lattice.zVec[1],
    lattice.zVec[2]
  );

  matrix.multiplyScalar(lattice.length);
  atoms.modelData = [{ symmetries: [], cryst: { matrix: matrix } }];
  var atomSymbols = lines[5].trim().split(/\s+/);
  var atomSpeciesNumber = new Int16Array(
    lines[6].trim().split(/\s+/) as any
  );
  var vaspMode = lines[7].trim();

  var selective = false
  if (vaspMode.match(/S/)) {
    selective = true
    vaspMode = lines[8].trim();
  }

  if (vaspMode.toLowerCase()[0] == "c") {
    vaspMode = "cartesian";
  } else if (vaspMode.toLowerCase()[0] == "d") {
    vaspMode = "direct";
  } else {    
    console.log(
      "Warning: Unknown vasp mode in POSCAR file: mode must be either C(artesian) or D(irect)"
    );
    return atoms;
  }

  if (atomSymbols.length != atomSpeciesNumber.length) {
    console.log("Warning: declaration of atomary species wrong:");
    console.log(atomSymbols);
    console.log(atomSpeciesNumber);
    return atoms;
  }

  if (selective) {
    lines.splice(0, 9);
  }
  else {
    lines.splice(0, 8);
  }

  var atomCounter = 0;

  for (var i = 0, len = atomSymbols.length; i < len; i++) {
    var atomSymbol = atomSymbols[i];
    for (var j = 0, atomLen = atomSpeciesNumber[i]; j < atomLen; j++) {
      var coords = new Float32Array(
        lines[atomCounter + j].trim().split(/\s+/) as any
      );

      var atom: AtomSpec = {};
      (atom.elem as any) = atomSymbol;
      if (vaspMode == "cartesian") {
        atom.x = lattice.length * coords[0];
        atom.y = lattice.length * coords[1];
        atom.z = lattice.length * coords[2];
      } else {
        atom.x =
          lattice.length *
          (coords[0] * lattice.xVec[0] +
            coords[1] * lattice.yVec[0] +
            coords[2] * lattice.zVec[0]);
        atom.y =
          lattice.length *
          (coords[0] * lattice.xVec[1] +
            coords[1] * lattice.yVec[1] +
            coords[2] * lattice.zVec[1]);
        atom.z =
          lattice.length *
          (coords[0] * lattice.xVec[2] +
            coords[1] * lattice.yVec[2] +
            coords[2] * lattice.zVec[2]);
      }

      atom.bonds = [];
      atom.bondOrder = [];

      atoms[0].push(atom);
    }
    atomCounter += atomSpeciesNumber[i];
  }

  if (assignbonds) {
    for (let i = 0; i < atoms.length; i++) {
      assignBonds(atoms[i], options);
    }
  }
  return atoms;
}
