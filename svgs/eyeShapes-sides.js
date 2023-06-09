const fs = require("fs");
console.log(process.cwd());

// Make sure that the entire enclosing <g> has a class="collateral"

function stripSvg(svg) {
  // removes svg tag
  if (svg.includes("viewBox")) {
    svg = svg.slice(svg.indexOf(">") + 1);
    svg = svg.replace("</svg>", "");
  }
  return svg;
}

function readSvg(name) {
  return stripSvg(
    fs.readFileSync(`./svgs/eyeShapes-sides/${name}.svg`, "utf8")
  );
}

function eyeShape(name) {
  let svg = readSvg(name);
  svg = `<g class="gotchi-eyeColor">${svg}</g>`;
  return svg;
}

const eyeShapesLeftSvgs = [
  eyeShape("mythical_low_1_left"),
  eyeShape("mythical_low_2_left"),
  eyeShape("rare_low_1_left"),
  eyeShape("rare_low_2_left"),
  eyeShape("rare_low_3_left"),
  eyeShape("uncommon_low_1_left"),
  eyeShape("uncommon_low_2_left"),
  eyeShape("uncommon_low_3_left"),
  eyeShape("common_1_left"),
  eyeShape("common_2_left"),
  eyeShape("common_3_left"),
  eyeShape("uncommon_high_1_left"),
  eyeShape("uncommon_high_2_left"),
  eyeShape("uncommon_high_3_left"),
  eyeShape("rare_high_1_left"),
  eyeShape("rare_high_2_left"),
  eyeShape("rare_high_3_left"),
  eyeShape("aave_collateral_left_eyeShapes"),
  eyeShape("dai_collateral_left_eyeShapes"),
  eyeShape("eth_collateral_left_eyeShapes"),
  eyeShape("link_collateral_left_eyeShapes"),
  eyeShape("usdc_collateral_left_eyeShapes"),
  eyeShape("yfi_collateral_left_eyeShapes"),
  eyeShape("uni_collateral_left_eyeShapes"),
  eyeShape("tusd_collateral_left_eyeShapes"),
  eyeShape("usdt_collateral_left_eyeShapes"),
];

const eyeShapesRightSvgs = [
  eyeShape("mythical_low_1_right"),
  eyeShape("mythical_low_2_right"),
  eyeShape("rare_low_1_right"),
  eyeShape("rare_low_2_right"),
  eyeShape("rare_low_3_right"),
  eyeShape("uncommon_low_1_right"),
  eyeShape("uncommon_low_2_right"),
  eyeShape("uncommon_low_3_right"),
  eyeShape("common_1_right"),
  eyeShape("common_2_right"),
  eyeShape("common_3_right"),
  eyeShape("uncommon_high_1_right"),
  eyeShape("uncommon_high_2_right"),
  eyeShape("uncommon_high_3_right"),
  eyeShape("rare_high_1_right"),
  eyeShape("rare_high_2_right"),
  eyeShape("rare_high_3_right"),
  eyeShape("aave_collateral_right_eyeShapes"),
  eyeShape("dai_collateral_right_eyeShapes"),
  eyeShape("eth_collateral_right_eyeShapes"),
  eyeShape("link_collateral_right_eyeShapes"),
  eyeShape("usdc_collateral_right_eyeShapes"),
  eyeShape("yfi_collateral_right_eyeShapes"),
  eyeShape("uni_collateral_right_eyeShapes"),
  eyeShape("tusd_collateral_right_eyeShapes"),
  eyeShape("usdt_collateral_right_eyeShapes"),
];

exports.eyeShapesLeftSvgs = eyeShapesLeftSvgs;
exports.eyeShapesRightSvgs = eyeShapesRightSvgs;
