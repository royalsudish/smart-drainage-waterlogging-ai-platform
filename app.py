from flask import Flask, render_template
from backend.routes.api import api_bp

def create_app():
    app = Flask(
        __name__,
        template_folder="frontend/templates",
        static_folder="frontend/static",
        static_url_path="/static",
    )
    app.config["JSON_SORT_KEYS"] = False
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/")
    @app.get("/home")
    @app.get("/location")
    @app.get("/drainage")
    @app.get("/waterlogging")
    def home():
        return render_template("index.html")

    return app

if __name__ == "__main__":
    import os
    debug_val = os.getenv("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    port = int(os.getenv("PORT", "5000"))
    create_app().run(host="0.0.0.0", port=port, debug=debug_val, threaded=True, use_reloader=False)
