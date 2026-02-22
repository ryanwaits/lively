import type Anthropic from "@anthropic-ai/sdk";

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "createStickyNote",
    description:
      "Create a sticky note on the whiteboard. Default size is 200x200. Default color is yellow (#fef08a).",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text content of the sticky note" },
        x: { type: "number", description: "X position (pixels from left)" },
        y: { type: "number", description: "Y position (pixels from top)" },
        color: {
          type: "string",
          description: "Background color hex",
          enum: ["#fef08a", "#fecdd3", "#dcfce7", "#dbeafe", "#fed7aa", "#e9d5ff", "#fecaca", "#ffffff"],
        },
      },
      required: ["text"],
    },
  },
  {
    name: "createShape",
    description:
      "Create a shape or text label on the whiteboard. Rectangle: 200x150, #bfdbfe. Circle: 150x150, #dbeafe. Diamond: 150x150, #e9d5ff. Pill: 200x80, #d1fae5. Text: 300x40, transparent.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["rectangle", "text", "circle", "diamond", "pill"], description: "Shape type" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        color: { type: "string", description: "Background color hex" },
        text: { type: "string", description: "Optional text inside the shape" },
      },
      required: ["type"],
    },
  },
  {
    name: "moveObject",
    description: "Move an existing object to a new position.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectId: { type: "string", description: "ID of the object to move" },
        x: { type: "number", description: "New X position" },
        y: { type: "number", description: "New Y position" },
      },
      required: ["objectId", "x", "y"],
    },
  },
  {
    name: "resizeObject",
    description: "Resize an existing object.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectId: { type: "string", description: "ID of the object to resize" },
        width: { type: "number", description: "New width" },
        height: { type: "number", description: "New height" },
      },
      required: ["objectId", "width", "height"],
    },
  },
  {
    name: "updateText",
    description: "Update the text content of an existing object.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectId: { type: "string", description: "ID of the object" },
        newText: { type: "string", description: "New text content" },
      },
      required: ["objectId", "newText"],
    },
  },
  {
    name: "changeColor",
    description: "Change the background color of an existing object.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectId: { type: "string", description: "ID of the object" },
        color: { type: "string", description: "New color hex" },
      },
      required: ["objectId", "color"],
    },
  },
  {
    name: "deleteObject",
    description: "Delete an object from the whiteboard.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectId: { type: "string", description: "ID of the object to delete" },
      },
      required: ["objectId"],
    },
  },
  {
    name: "createConnector",
    description:
      "Create a line/arrow between two objects or points. Must provide fromObjectId or fromPoint, and toObjectId or toPoint.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromObjectId: { type: "string", description: "ID of the source object to connect from" },
        toObjectId: { type: "string", description: "ID of the target object to connect to" },
        fromPoint: {
          type: "object" as const,
          properties: { x: { type: "number" }, y: { type: "number" } },
          description: "Start point if not connecting to an object",
        },
        toPoint: {
          type: "object" as const,
          properties: { x: { type: "number" }, y: { type: "number" } },
          description: "End point if not connecting to an object",
        },
        arrowEnd: {
          type: "string",
          enum: ["none", "end", "start", "both"],
          description: "Arrow placement. Default: end",
        },
        color: { type: "string", description: "Stroke color hex. Default: #374151" },
        label: { type: "string", description: "Text label rendered at the midpoint of the line" },
      },
      required: [],
    },
  },
  {
    name: "createFrame",
    description:
      "Create a new empty frame. ONLY use when the user EXPLICITLY asks to create/add a new frame. Never use for templates (SWOT, Kanban, Retro, etc.) — those go on the active frame using shapes.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: { type: "string", description: "Display label for the frame (default: 'Frame N')" },
      },
      required: [],
    },
  },
  {
    name: "deleteFrame",
    description:
      "Delete a frame and all objects inside it (cascade delete). Cannot delete the last remaining frame.",
    input_schema: {
      type: "object" as const,
      properties: {
        frameId: { type: "string", description: "ID of the frame to delete" },
      },
      required: ["frameId"],
    },
  },
  {
    name: "addStamp",
    description:
      "Place an emoji stamp/reaction on the whiteboard. Optionally attach to an existing object (auto-offsets to corner with jitter).",
    input_schema: {
      type: "object" as const,
      properties: {
        emoji_type: {
          type: "string",
          enum: ["thumbsup", "heart", "fire", "star", "eyes", "laughing", "party", "plusone"],
          description: "Which emoji to place",
        },
        x: { type: "number", description: "X position (ignored if targetObjectId provided)" },
        y: { type: "number", description: "Y position (ignored if targetObjectId provided)" },
        targetObjectId: {
          type: "string",
          description: "ID of an existing object to stick the stamp on (auto-offsets to top-right corner)",
        },
      },
      required: ["emoji_type"],
    },
  },
  {
    name: "createDrawing",
    description:
      "Create a freehand drawing/stroke from a point array. Each call = one stroke. Points are auto-simplified. Use 15-40 points for curves, 2-5 for straight segments.",
    input_schema: {
      type: "object" as const,
      properties: {
        points: {
          type: "array",
          items: {
            type: "object" as const,
            properties: { x: { type: "number" }, y: { type: "number" } },
            required: ["x", "y"],
          },
          minItems: 2,
          description: "Array of {x, y} points defining the stroke path",
        },
        stroke_color: { type: "string", description: "Stroke color hex. Default: #374151" },
        stroke_width: { type: "number", description: "Stroke width in pixels. Default: 2" },
      },
      required: ["points"],
    },
  },
  {
    name: "getBoardState",
    description:
      "Get current board state. Only use if you need to re-check object positions before modifying them.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
