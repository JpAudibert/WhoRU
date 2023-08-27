import os
import string
from typing import Annotated
import uuid
import pickle
import datetime
import time
import shutil

import cv2
from fastapi import FastAPI, File, Request, UploadFile, Form, UploadFile, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
from pydantic import BaseModel
import starlette
import uvicorn


ATTENDANCE_LOG_DIR = "./logs"
DB_PATH = "./db"
for dir_ in [ATTENDANCE_LOG_DIR, DB_PATH]:
    if not os.path.exists(dir_):
        os.mkdir(dir_)

app = FastAPI()
PREFIX = "/api/v1/faces"

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.post(PREFIX + "/identify")
# async def indentify(file: UploadFile = File(...)):
#     file.filename = f"{uuid.uuid4()}.png"
#     contents = await file.read()

#     # example of how you can save the file
#     with open(file.filename, "wb") as f:
#         f.write(contents)

#     user_name, match_status = recognize(cv2.imread(file.filename))

#     if match_status:
#         epoch_time = time.time()
#         date = time.strftime("%Y%m%d", time.localtime(epoch_time))
#         with open(os.path.join(ATTENDANCE_LOG_DIR, "{}.csv".format(date)), "a") as f:
#             f.write("{},{},{}\n".format(user_name, datetime.datetime.now(), "IN"))
#             f.close()

#     return {"user": user_name, "match_status": match_status}

@app.post(PREFIX + "/identify")
async def indentify(request: Request):
    body = request.body()
    print(body)

@app.post(PREFIX + "/register")
async def register(file: UploadFile = File(...), name: str = Form(...)):
    file.filename = f"{uuid.uuid4()}.png"
    contents = await file.read()

    # example of how you can save the file
    with open(file.filename, "wb") as f:
        f.write(contents)

    shutil.copy(file.filename, os.path.join(DB_PATH, "{}.png".format(name)))

    embeddings = face_recognition.face_encodings(cv2.imread(file.filename))

    file_ = open(os.path.join(DB_PATH, "{}.pickle".format(name)), "wb")
    pickle.dump(embeddings, file_)
    print(file.filename, name)

    os.remove(file.filename)

    return {"registration_status": 200}


@app.get(PREFIX + "/get_attendance_logs")
async def get_attendance_logs():
    filename = "out.zip"

    shutil.make_archive(filename[:-4], "zip", ATTENDANCE_LOG_DIR)

    ##return File(filename, filename=filename, content_type="application/zip", as_attachment=True)
    return starlette.responses.FileResponse(
        filename, media_type="application/zip", filename=filename
    )

def recognize(img):
    # it is assumed there will be at most 1 match in the db

    embeddings_unknown = face_recognition.face_encodings(img)
    if len(embeddings_unknown) == 0:
        return "no_persons_found", False
    else:
        embeddings_unknown = embeddings_unknown[0]

    match = False
    j = 0

    db_dir = sorted([j for j in os.listdir(DB_PATH) if j.endswith(".pickle")])
    # db_dir = sorted(os.listdir(DB_PATH))
    print(db_dir)
    while (not match) and (j < len(db_dir)):
        path_ = os.path.join(DB_PATH, db_dir[j])

        file = open(path_, "rb")
        embeddings = pickle.load(file)[0]

        match = face_recognition.compare_faces([embeddings], embeddings_unknown)[0]

        j += 1

    if match:
        return db_dir[j - 1][:-7], True
    else:
        return "unknown_person", False

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)