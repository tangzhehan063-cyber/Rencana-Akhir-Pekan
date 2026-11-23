"""Scene stickman 3D yang dibangun sepenuhnya dari kode (Blender headless, tanpa GUI).

Pemakaian:
    python stickman_scene.py --out render.png [--blend scene.blend] [--samples 48]
    python stickman_scene.py --out frames/ --animate   # render animasi berjalan (PNG per frame)

Butuh modul `bpy` (Blender sebagai paket Python): `uv pip install bpy`.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv[1:]
    if "--" in argv:  # dukung juga: blender -b -P stickman_scene.py -- --out x.png
        argv = argv[argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="render.png")
    p.add_argument("--blend", default=None, help="simpan file .blend juga")
    p.add_argument("--samples", type=int, default=48)
    p.add_argument("--res", default="1280x720")
    p.add_argument("--animate", action="store_true")
    p.add_argument("--frames", type=int, default=48)
    return p.parse_args(argv)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, emission=0.0, roughness=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return m


def limb(name, a, b, radius, mat, parent=None):
    """Silinder dari titik a ke b, ujung bulat (gaya garis stickman)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=d.length, vertices=24,
                                        location=(a + b) / 2)
    cyl = bpy.context.object
    cyl.name = name
    cyl.rotation_mode = "QUATERNION"
    cyl.rotation_quaternion = d.to_track_quat("Z", "Y")
    cyl.data.materials.append(mat)
    for i, p in enumerate((a, b)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=p, segments=24, ring_count=12)
        cap = bpy.context.object
        cap.name = f"{name}_cap{i}"
        cap.data.materials.append(mat)
        cap.parent = cyl
        cap.matrix_parent_inverse = cyl.matrix_world.inverted()
    bpy.ops.object.shade_smooth()
    if parent:
        cyl.parent = parent
        cyl.matrix_parent_inverse = parent.matrix_world.inverted()
    return cyl


def build_stickman(loc, mat, pose="wave"):
    root = bpy.data.objects.new("Stickman", None)
    bpy.context.collection.objects.link(root)
    root.location = loc
    bpy.context.view_layer.update()
    x, y, z = loc
    r = 0.06
    hip, neck = (x, y, z + 1.0), (x, y, z + 1.75)
    limb("Torso", hip, neck, r, mat, root)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(x, y, z + 2.08), segments=32, ring_count=16)
    head = bpy.context.object
    head.name = "Head"
    head.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    head.parent = root
    head.matrix_parent_inverse = root.matrix_world.inverted()
    # kaki
    limb("LegL", hip, (x - 0.35, y, z), r, mat, root)
    limb("LegR", hip, (x + 0.35, y, z), r, mat, root)
    # lengan
    shoulder = (x, y, z + 1.6)
    if pose == "wave":
        limb("ArmL", shoulder, (x - 0.3, y, z + 1.0), r, mat, root)
        elbow = (x + 0.45, y, z + 1.85)
        limb("ArmR", shoulder, elbow, r, mat, root)
        limb("ForearmR", elbow, (x + 0.62, y, z + 2.35), r, mat, root)
    else:
        limb("ArmL", shoulder, (x - 0.5, y, z + 1.15), r, mat, root)
        limb("ArmR", shoulder, (x + 0.5, y, z + 1.15), r, mat, root)
    return root


def build_world():
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.92, 0.94, 0.97, 1)
    bg.inputs["Strength"].default_value = 0.6

    # lantai lengkung tanpa sudut (infinity cove) seperti studio
    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "Floor"
    floor.data.materials.append(material("FloorMat", (0.95, 0.95, 0.93), roughness=0.9))

    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 8, 50), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object
    wall.data.materials.append(material("WallMat", (0.98, 0.82, 0.45), roughness=0.9))

    # cahaya: key + rim
    bpy.ops.object.light_add(type="AREA", location=(-3, -4, 5))
    key = bpy.context.object
    key.data.energy = 900
    key.data.size = 4
    key.rotation_euler = (math.radians(50), 0, math.radians(-35))
    bpy.ops.object.light_add(type="AREA", location=(3, 3, 4))
    rim = bpy.context.object
    rim.data.energy = 400
    rim.data.size = 2
    rim.rotation_euler = (math.radians(-60), 0, math.radians(140))


def build_camera(target=(0, 0, 1.1)):
    bpy.ops.object.camera_add(location=(0.8, -6.5, 1.9))
    cam = bpy.context.object
    cam.data.lens = 40
    bpy.context.scene.camera = cam
    tgt = bpy.data.objects.new("CamTarget", None)
    tgt.location = target
    bpy.context.collection.objects.link(tgt)
    c = cam.constraints.new("TRACK_TO")
    c.target = tgt
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    return cam


def animate(root, cam, frames):
    """Stickman melompat-lompat kecil + kamera orbit pelan."""
    scn = bpy.context.scene
    scn.frame_start, scn.frame_end = 1, frames
    scn.render.fps = 24
    base = root.location.copy()
    for f in range(1, frames + 1):
        t = (f - 1) / frames
        root.location = base + Vector((0, 0, abs(math.sin(t * math.pi * 4)) * 0.35))
        root.rotation_euler = (0, 0, math.sin(t * math.pi * 2) * 0.4)
        root.keyframe_insert("location", frame=f)
        root.keyframe_insert("rotation_euler", frame=f)
        ang = math.radians(-80) + t * math.radians(40)
        cam.location = (6.5 * math.cos(ang), 6.5 * math.sin(ang), 1.9)
        cam.keyframe_insert("location", frame=f)


def setup_render(args):
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = args.samples
    scn.cycles.use_denoising = True
    w, h = (int(v) for v in args.res.split("x"))
    scn.render.resolution_x, scn.render.resolution_y = w, h
    scn.view_settings.view_transform = "AgX"
    scn.view_settings.look = "AgX - Medium High Contrast"
    scn.render.image_settings.file_format = "PNG"


def main():
    args = parse_args()
    reset_scene()
    build_world()
    ink = material("Ink", (0.008, 0.008, 0.012), roughness=0.6)
    accent = material("Accent", (0.85, 0.05, 0.08), roughness=0.4)
    hero = build_stickman((0, 0, 0), ink, pose="wave")
    # bola merah di samping sebagai aksen
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(1.4, 0.6, 0.35))
    bpy.context.object.data.materials.append(accent)
    bpy.ops.object.shade_smooth()
    cam = build_camera()
    setup_render(args)

    if args.animate:
        animate(hero, cam, args.frames)
        os.makedirs(args.out, exist_ok=True)
        bpy.context.scene.render.filepath = os.path.join(os.path.abspath(args.out), "frame_")
        bpy.ops.render.render(animation=True)
    else:
        bpy.context.scene.render.filepath = os.path.abspath(args.out)
        bpy.ops.render.render(write_still=True)

    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.blend))
    print("SELESAI:", os.path.abspath(args.out))


if __name__ == "__main__":
    main()
