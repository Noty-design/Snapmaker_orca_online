$fn=84;
difference() {
  union() {
    cylinder(d=55, h=5);
    translate([0,0,5]) cylinder(d1=34, d2=26, h=12);
    translate([0,0,17]) cylinder(d=26, h=3);
  }
  translate([0,0,-1]) cylinder(d=11, h=24);
  for(a=[0:60:300]) rotate([0,0,a])
    translate([20,0,-1]) cylinder(d=5, h=8);
}
