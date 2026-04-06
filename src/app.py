from flask import Flask, request, redirect, render_template
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import os

app = Flask(__name__)
load_dotenv(dotenv_path="../.env")

sp_oauth = SpotifyOAuth(
    scope="user-read-currently-playing",
)

@app.route("/")
def login():
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    sp_oauth.get_access_token(code)
    return redirect("/player")

@app.route("/current")
def current():
    token_info = sp_oauth.get_access_token(as_dict=True)    
    if not token_info:
        return {"error": "not authenticated"}

    sp = spotipy.Spotify(auth=token_info['access_token'])
    current = sp.current_user_playing_track()

    if not current:
        return {"playing": False}

    return {
        "playing": True,
        "track": current['item']['name'],
        "artist": current['item']['artists'][0]['name'],
        "album_art": current['item']['album']['images'][0]['url'],
        "progress": current['progress_ms'],
        "duration": current['item']['duration_ms']
    }
@app.route("/player")
def player():
    return render_template("player.html")

if __name__ == "__main__":
    app.run(port=8888)