import base64
import os
from typing import Annotated, List
import uuid
import pickle
import datetime
import time
import shutil
from time import sleep

import cv2
from fastapi import FastAPI, File, UploadFile, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import starlette
import uvicorn

# remove recognizer
BATCH_PATH = "batch"
REGISTERS_PATH = "registers"
ZIP_PATH = "logs"
ZIP_PATH = "files"
ATTENDANCE_LOG_PATH = "logs"
DB_PATH = "db"
CONFIRMATION_PATH = "confirmation"

PREFIX = "/api/v1/faces"

for dir_ in [
    BATCH_PATH,
    REGISTERS_PATH,
    ATTENDANCE_LOG_PATH,
    DB_PATH,
    ZIP_PATH,
    CONFIRMATION_PATH,
]:
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
async def identify(data: str = Form(...), tolerance: float = Form(0.6)):
    recognitionId = str(uuid.uuid4())
    user_name = ""
    match_percentage = 0
    match_status = False

    fileData = base64.b64decode(data)
    fileName = f"files/{uuid.uuid4()}.png"

    file = UploadFile(file=fileData, filename=fileName)

    with open(file.filename, "wb") as f:
        f.write(fileData)

    user_name, match_percentage, match_status = recognize(
        cv2.imread(file.filename), tolerance
    )

    if match_status:
        epoch_time = time.time()
        date = time.strftime("%Y%m%d", time.localtime(epoch_time))
        with open(os.path.join(ATTENDANCE_LOG_PATH, "{}.csv".format(date)), "a") as f:
            f.write(
                "{},{},{},{}\n".format(
                    recognitionId, user_name, match_percentage, datetime.datetime.now()
                )
            )
            f.close()

    os.remove(file.filename)

    return {
        "id": recognitionId,
        "name": user_name,
        "match_percentage": match_percentage,
        "match_status": match_status,
    }


def recognize(img, tolerance=0.55):
    person_name = "Unknown Person"
    match_percentage = 0
    is_match = False

    embeddings_unknown = []
    face_distance = 1
    match = False

    try:
        embeddings_unknown = face_recognition.face_encodings(img)
    except:
        print("Error looking for the embeddings")
        sleep(1)
        return "encoding_error", match_percentage, match

    if len(embeddings_unknown) == 0:
        return "no_persons_found", match_percentage, match
    else:
        embeddings_unknown = embeddings_unknown[0]

    j = 0

    db_dir = sorted([j for j in os.listdir(DB_PATH) if j.endswith(".pickle")])
    # db_dir = sorted(os.listdir(DB_PATH))
    print(db_dir)

    for j in range(len(db_dir)):
        path_ = os.path.join(DB_PATH, db_dir[j])

        file = open(path_, "rb")

        if os.stat(file.name).st_size == 0:
            return "corrupted file", match_percentage, match

        try:
            pickleEmbeddings = pickle.load(file)

            if len(pickleEmbeddings) > 0:
                embeddings = pickleEmbeddings[0]
        except:
            continue

        match = face_recognition.compare_faces([embeddings], embeddings_unknown, tolerance)[0]

        if match:
            new_face_distance = face_recognition.face_distance([embeddings], embeddings_unknown)[0]

            if new_face_distance < face_distance:
                person_name = db_dir[j][:-7]
                match_percentage = 1 - new_face_distance
                is_match = True
                
                face_distance = new_face_distance

    return person_name, round(match_percentage, 4), is_match

@app.post(PREFIX + "/confirmation")
async def confirm_identity(
    id: str = Form(...), name: str = Form(...), confirmation: str = Form(...)
):
    epoch_time = time.time()
    date = time.strftime("%Y%m%d", time.localtime(epoch_time))

    with open(os.path.join(CONFIRMATION_PATH, "{}.csv".format(date)), "a") as f:
        f.write("{},{},{}\n".format(id, name, confirmation))
        f.close()

    return {"status": 200}


@app.post(PREFIX + "/testing")
async def identify(file: UploadFile = File(...)):
    recognitionId = str(uuid.uuid4())

    file.filename = f"files/{uuid.uuid4()}.png"
    contents = await file.read()

    # example of how you can save the file
    with open(file.filename, "wb") as f:
        f.write(contents)

    user_name, match_percentage, match_status = recognize(cv2.imread(file.filename))

    if match_status:
        epoch_time = time.time()
        date = time.strftime("%Y%m%d", time.localtime(epoch_time))
        with open(os.path.join(ATTENDANCE_LOG_PATH, "{}.csv".format(date)), "a") as f:
            f.write(
                "{},{},{},{}\n".format(
                    recognitionId, user_name, match_percentage, datetime.datetime.now()
                )
            )
            f.close()

    os.remove(file.filename)

    return {
        "user": user_name,
        "match_percentage": match_percentage,
        "match_status": match_status,
    }


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
            with open(new_filename, "rb") as file:
                contents = file.read()
        except Exception as e:
            print(f"Error reading {new_filename}: {e}")

        file_to_insert = UploadFile(file=data, filename=new_filename)

        # example of how you can save the file
        with open(file_to_insert.filename, "wb") as f:
            f.write(contents)

        correct_filename = file_b.split("/")[-1].split(".")[0]

        shutil.copy(
            file_to_insert.filename,
            os.path.join(DB_PATH, "{}.png".format(correct_filename)),
        )

        embeddings = face_recognition.face_encodings(
            cv2.imread(file_to_insert.filename)
        )

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
