import base64
import os
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

#remove recognizer
BATCH_PATH = "batch"
REGISTERS_PATH = "registers"
ZIP_PATH = "logs"
ATTENDANCE_LOG_PATH = "logs"
DB_PATH = "db"
CONFIRMATION_PATH = "confirmation"

PREFIX = "/api/v1/faces"

for dir_ in [BATCH_PATH, REGISTERS_PATH, ATTENDANCE_LOG_PATH, DB_PATH, ZIP_PATH, CONFIRMATION_PATH]:
    if not os.path.exists(dir_):
        os.mkdir(dir_)

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post(PREFIX + "/identify")
async def identify(data: str = Form(...)):
    fileData = base64.b64decode(data)
    fileName = f"files/{uuid.uuid4()}.png"

    file = UploadFile(file=fileData, filename=fileName)

    with open(file.filename, "wb") as f:
        f.write(fileData)

    user_name, match_percentage, match_status = recognize(cv2.imread(file.filename))

    if match_status:
        epoch_time = time.time()
        date = time.strftime("%Y%m%d", time.localtime(epoch_time))
        with open(os.path.join(ATTENDANCE_LOG_PATH, "{}.csv".format(date)), "a") as f:
            f.write("{},{}\n".format(user_name, datetime.datetime.now()))
            f.close()

    os.remove(file.filename)

    return {
        "name": user_name,
        "match_percentage": match_percentage,
        "match_status": match_status,
    }

def recognize(img):
    face_distance = 0
    match = False

    try:
        embeddings_unknown = face_recognition.face_encodings(img)
    except:
        print("Error looking for the embeddings")
        return "no person found", face_distance, match

    if len(embeddings_unknown) == 0:
        return "no_persons_found", face_distance, match
    else:
        embeddings_unknown = embeddings_unknown[0]

    j = 0

    db_dir = sorted([j for j in os.listdir(DB_PATH) if j.endswith(".pickle")])
    # db_dir = sorted(os.listdir(DB_PATH))
    print(db_dir)
    while (not match) and (j < len(db_dir)):
        path_ = os.path.join(DB_PATH, db_dir[j])

        file = open(path_, "rb")

        if os.stat(file.name).st_size == 0:
            return "corrupted file", face_distance, match

        try:
            embeddings = pickle.load(file)[0]
        except:
            print("Error loading pickle file")
            return "corrupted file", face_distance, match

        match = face_recognition.compare_faces([embeddings], embeddings_unknown)[0]

        j += 1

    if match:
        face_distance = face_recognition.face_distance(
            [embeddings], embeddings_unknown
        )[0]
        face_distance = 1 - face_distance

        return db_dir[j - 1][:-7], round(face_distance, 4), True
    else:
        return "unknown_person", face_distance, match

@app.post(PREFIX + "/confirmation")
async def confirm_identity(name: str = Form(...), confirmation: str = Form(...)):
    epoch_time = time.time()
    date = time.strftime("%Y%m%d", time.localtime(epoch_time))

    with open(os.path.join(CONFIRMATION_PATH, "{}.csv".format(date)), "a") as f:
        f.write("{},{}\n".format(name, confirmation))
        f.close()

    return {"status": 200}

@app.post(PREFIX + "/testing")
async def identify(file: UploadFile = File(...)):
    file.filename = f"{uuid.uuid4()}.png"
    contents = await file.read()

    # example of how you can save the file
    with open(file.filename, "wb") as f:
        f.write(contents)

    user_name, match_percentage , match_status = recognize(cv2.imread(file.filename))

    if match_status:
        epoch_time = time.time()
        date = time.strftime("%Y%m%d", time.localtime(epoch_time))
        with open(os.path.join(ATTENDANCE_LOG_PATH, "{}.csv".format(date)), "a") as f:
            f.write("{},{},{}\n".format(user_name, datetime.datetime.now(), "IN"))
            f.close()

    os.remove(file.filename)

    return {"user": user_name, "match_percentage": match_percentage, "match_status": match_status}

@app.post(PREFIX + "/register")
async def register(file: UploadFile = File(...), name: str = Form(...)):
    file.filename = f"registers/{uuid.uuid4()}.png"
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

@app.post(PREFIX + "/register/batch")
async def register():
    files_batch = os.listdir(BATCH_PATH)

    for file_b in files_batch:
        new_filename = os.path.join(BATCH_PATH, file_b)
        data = None

        try:
            with open(new_filename, 'rb') as file:
                contents = file.read()
        except Exception as e:
            print(f"Error reading {new_filename}: {e}")

        file_to_insert = UploadFile(file=data, filename=new_filename)

        # example of how you can save the file
        with open(file_to_insert.filename, "wb") as f:
            f.write(contents)

        correct_filename = file_b.split("/")[-1].split(".")[0]

        shutil.copy(file_to_insert.filename, os.path.join(DB_PATH, "{}.png".format(correct_filename)))

        embeddings = face_recognition.face_encodings(cv2.imread(file_to_insert.filename))


        file_ = open(os.path.join(DB_PATH, "{}.pickle".format(correct_filename)), "wb")
        pickle.dump(embeddings, file_)
        print(file_to_insert.filename, file_to_insert.filename)

        os.remove(file_to_insert.filename)

    return {"registration_status": 200}

@app.get(PREFIX + "/get_attendance_logs")
async def get_attendance_logs():
    filename = ZIP_PATH + "out.zip"

    shutil.make_archive(filename[:-4], "zip", ZIP_PATH)

    ##return File(filename, filename=filename, content_type="application/zip", as_attachment=True)
    return starlette.responses.FileResponse(
        filename, media_type="application/zip", filename=filename
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=False)
