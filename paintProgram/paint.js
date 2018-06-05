// general function for creating elements
function elt(name, attributes) {
    var node = document.createElement(name);

    if (attributes) {
        for (var attr in attributes) {
            if (attributes.hasOwnProperty(attr)) {
                node.setAttribute(attr, attributes[attr]);
            }
        }
    }

    for (var i = 2; i < arguments.length; i++) {
        var child = arguments[i];
        if (typeof child == "string"){
            child = document.createTextNode(child);
        }
        node.appendChild(child);
    }

    return node;
}

var controls = Object.create(null);


function createPaint(parent) {
    var canvas = elt("canvas", {
        width: 500,
        height: 300
    });
    var cx = canvas.getContext("2d");
    var toolbar = elt("div", {
        class: "toolbar"
    });

    for (var name in controls) {
        toolbar.appendChild(controls[name](cx));
    }

    var panel = elt("div", {
        class: "picturepanel"
    }, canvas);
    parent.appendChild(elt("div", null, panel, toolbar));
}

var tools = Object.create(null);


controls.tool = function(cx) {
    var select = elt("select");

    for (var name in tools) {
        select.appendChild(elt("option", null, name));
    }

    cx.canvas.addEventListener("mousedown", function(event) {
        if (event.which == 1) {
            tools[select.value](event, cx);
            event.preventDefault();
        }
    });

    return elt("span", null, "Tool:", select);
}

// find the position of the cursor on the canvas
function relativePos(event, element) {
    var rect = element.getBoundingClientRect();

    return {
        x: Math.floor(event.clientX - rect.left),
        y: Math.floor(event.clientY - rect.top)
    };
}

// tracks mouse when held down
function trackDrag(onMove, onEnd) {
    function end(event) {
        removeEventListener("mousemove", onMove);
        removeEventListener("mouseup", end);

        if (onEnd){
            onEnd(event);
        }
    }

    addEventListener("mousemove", onMove);
    addEventListener("mouseup", end);
}

//the line tool
tools.Line = function(event, cx, onEnd) {
    cx.lineCap = "round";

    var pos = relativePos(event, cx.canvas);
    trackDrag(function(event) {
        cx.beginPath();
        cx.moveTo(pos.x, pos.y);
        pos = relativePos(event, cx.canvas);
        cx.lineTo(pos.x, pos.y);
        cx.stroke();
    }, onEnd);
};

//the eraser tool
tools.Erase = function(event, cx) {
    cx.globalCompositeOperation = "destination-out";
    tools.Line(event, cx, function() {
        cx.globalCompositeOperation = "source-over";
    });
};

//color picker
controls.color = function(cx) {
    var input = elt("input", {
        type: "color"
    });

    input.addEventListener("change", function() {
        cx.fillStyle = input.value;
        cx.strokeStyle = input.value;
    });

    return elt("span", null, "Color: ", input);
};

// choose brush size
controls.brushSize = function(cx) {
    var select = elt("select");
    var sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100];

    sizes.forEach(function(size) {
        select.appendChild(elt("option", {
            value: size
        }, size + " pixels"));
    });

    select.addEventListener("change", function() {
        cx.lineWidth = select.value;
    });

    return elt("span", null, "Brush size: ", select);
};

// text tool
tools.Text = function(event, cx) {
    var text = prompt("Text:", "");
    if (text) {
        var pos = relativePos(event, cx.canvas);
        cx.font = Math.max(7, cx.lineWidth) + " px sans-serif";
        cx.fillText(text, pos.x, pos.y);
    }
};

// spray paint tool
tools.Spray = function(event, cx) {
    var radius = cx.lineWidth / 2;
    var area = radius * radius * Math.PI;
    var dotsPerTick = Math.ceil(area / 30);
    var currentPos = relativePos(event, cx.canvas);
    var spray = setInterval(function() {
        for (var i = 0; i < dotsPerTick; i++) {
            var offset = randomPointInRadius(radius);
            cx.fillRect(currentPos.x + offset.x,
                currentPos.y + offset.y, 1, 1);
        }
    }, 25);

    trackDrag(function(event) {
        currentPos = relativePos(event, cx.canvas);
    }, function() {
        clearInterval(spray);
    });
};

//draw a rectangle
tools.Rectangle = function(event, cx) {
    var leftX, rightX, topY, bottomY;
    var holder = elt('div', {class: 'holder'});
    var initialPos = relativePos(event, cx.canvas);

    var xOff = event.clientX - initialPos.x;
    var yOff = event.clientY - initialPos.y;

    trackDrag(function(event)
    {
        document.body.appendChild(holder);

        var currentPos = relativePos(event, cx.canvas);
        var startX = initialPos.x;
        var startY = initialPos.y;


        if (startX < currentPos.x) {
            leftX = startX;
            rightX = currentPos.x;
        } else {
            leftX = currentPos.x;
            rightX = startX;
        } if (startY < currentPos.y) {
        topY = startY;
        bottomY = currentPos.y;
    } else {
        topY = currentPos.y;
        bottomY = startY;
    }
        holder.style.background = cx.fillStyle;

        holder.style.left = leftX + xOff + 'px';
        holder.style.top = topY + yOff + 'px';
        holder.style.width = rightX - leftX + 'px';
        holder.style.height = bottomY - topY + 'px';
    }, function() {
        cx.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
        document.body.removeChild(holder);
    });
};

function randomPointInRadius(radius) {
    for (;;) {
        var x = Math.random() * 2 - 1;
        var y = Math.random() * 2 - 1;

        if (x * x + y * y <= 1) {
            return {
                x: x * radius,
                y: y * radius
            };
        }
    }
}

// saving a picture
controls.save = function(cx) {
    var link = elt("a", {
        href: "/"
    }, "Save");

    function update() {
        try {
            link.href = cx.canvas.toDataURL();
        } catch (e) {
            if (e instanceof SecurityError) {
                link.href = "javascript:alert(" +
                    JSON.stringify("Can't save:" + e.toString()) + ")";
            } else{
                throw e;
            }
        }
    }

    link.addEventListener("mouseover", update);
    link.addEventListener("focus", update);
    return link;
}

// loading a picture
function loadImageURL (cx, url) {
    var image = document.createElement("img");
    image.addEventListener("load", function() {
        var color = cx.fillStyle, size = cx.lineWidth;

        cx.canvas.width = image.width;
        cx.canvas.height = image.height;
        cx.drawImage(image, 0, 0);
        cx.fillStyle = color;
        cx.strokeStyle = color;
        cx.lineWidth = size;
    });

    image.src = url;
}

controls.openFile = function(cx) {
    var input = elt("input", {
        type: "file"
    });

    input.addEventListener("change", function() {
        if (input.files.length == 0){
            return;
        }
        var reader = new FileReader();

        reader.addEventListener("load", function() {
            loadImageURL(cx, reader.result);
        });
        reader.readAsDataURL(input.files[0]);
    });

    return elt("div", null, "Open file:", input);
};

controls.openURL = function(cx) {
    var input = elt("input", {
        type:"text"
    });
    var form = elt("form", null, "Open URL:", input,
        elt("button", {
            type: "submit"
        }, "load"));

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        loadImageURL(cx, form.querySelector("input").value);
    });

    return form;
};