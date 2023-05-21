using Emgu.CV;
using Emgu.CV.CvEnum;
using Emgu.CV.Face;
using Emgu.CV.Structure;
using Emgu.CV.Util;
using FaceRecognizer.Interfaces;
using FaceRecognizer.Models;
using System.Diagnostics;
using System.Drawing;
using static Emgu.CV.Face.FaceRecognizer;

namespace FaceRecognizer.Services;

public class PersonRecognizer : IDisposable, IPersonRecognizer
{
    private readonly CascadeClassifier _classifier;
    private EigenFaceRecognizer _eigenFaceRecognizer;
    private bool isTrained;

    List<Image<Gray, byte>> TrainedFaces = new();
    List<int> PersonsLables = new();
    List<string> PersonsNames = new();

    private bool disposedValue;

    public PersonRecognizer(EigenFaceRecognizer eigenFaceRecognizer)
    {
        _classifier = new CascadeClassifier("haarcascade_frontalface_alt.xml");
        _eigenFaceRecognizer = eigenFaceRecognizer;
    }

    public async Task<RecognizedPerson> Recognize(IFormFile image)
    {
        TrainAlgorithm();
        if (!isTrained)
            return new RecognizedPerson(false);

        using MemoryStream stream = new();

        await image.CopyToAsync(stream);
        byte[] bytes = stream.ToArray();
        string localFileName = Path.Combine($"inputImage_{DateTime.UtcNow:dd-mm-yyyy-hh-mm-ss}.jpg");

        if (!File.Exists(localFileName))
            File.Create(localFileName).Dispose();
        await File.WriteAllBytesAsync(localFileName, bytes);
        Image<Bgr, byte> resultImage = new(localFileName);

        File.Delete(localFileName);

        Rectangle[] faces = _classifier.DetectMultiScale(resultImage, 1.1, 3, Size.Empty, Size.Empty);

        if (faces.Length <= 0)
            return new RecognizedPerson(false);

        Rectangle face = faces.FirstOrDefault();
        resultImage.ROI = face;

        Image<Gray, Byte> grayFaceResult = resultImage.Convert<Gray, Byte>().Resize(200, 200, Inter.Cubic);
        CvInvoke.EqualizeHist(grayFaceResult, grayFaceResult);

        PredictionResult result = _eigenFaceRecognizer.Predict(grayFaceResult);
        Console.WriteLine(result);

        Dispose();

        if (result.Distance > 2000 || result.Label == -1)
            return new RecognizedPerson(false);

        return new RecognizedPerson(true)
        {
            Name = PersonsNames[result.Label],
        };

    }


    public async Task SaveImagesForTraining(List<IFormFile> images, string personName)
    {
        string path = "TrainedImages";
        using MemoryStream stream = new();
        if (!Directory.Exists(path))
            Directory.CreateDirectory(path);

        for (int i = 0; i < images.Count; i++)
        {
            await images[i].CopyToAsync(stream);
            byte[] bytes = stream.ToArray();

            string fileName = Path.Combine(path, $"{personName}_{i}.jpg");

            if (!File.Exists(fileName))
                File.Create(fileName).Dispose();
            await File.WriteAllBytesAsync(fileName, bytes);
            Image<Bgr, byte> resultImage = new(fileName);

            File.Delete(fileName);

            resultImage.Resize(200, 200, Inter.Cubic).Save(Path.Combine(path, $"{personName}_{DateTime.UtcNow:dd-mm-yyyy-hh-mm-ss}.jpg"));
            Thread.Sleep(1000);
        }
    }


    public bool TrainAlgorithm()
    {
        string path = "TrainedImages";
        int ImagesCount = 0;
        double Threshold = 2000;
        TrainedFaces.Clear();
        PersonsLables.Clear();
        PersonsNames.Clear();

        try
        {
            string[] files = Directory.GetFiles(path, "*.jpg", SearchOption.AllDirectories);

            foreach (var file in files)
            {
                Image<Gray, byte> trainedImage = new Image<Gray, byte>(file).Resize(200, 200, Inter.Cubic);
                CvInvoke.EqualizeHist(trainedImage, trainedImage);
                TrainedFaces.Add(trainedImage);
                PersonsLables.Add(ImagesCount);
                string name = file.Split(Path.PathSeparator).Last().Split('_')[0];
                PersonsNames.Add(name);
                ImagesCount++;
                Debug.WriteLine(ImagesCount + ". " + name);

            }

            if (TrainedFaces.Count > 0)
            {
                Image<Gray, byte>[] trainedFaces = TrainedFaces.ToArray();
                int[] personsLables = PersonsLables.ToArray();

                VectorOfMat vectorOfMat = new VectorOfMat();
                VectorOfInt vectorOfInt = new VectorOfInt();

                vectorOfMat.Push(trainedFaces);
                vectorOfInt.Push(personsLables);

                _eigenFaceRecognizer ??= new EigenFaceRecognizer(ImagesCount, Threshold);
                _eigenFaceRecognizer.Train(vectorOfMat, vectorOfInt);

                isTrained = true;
                return true;
            }
            else
            {
                isTrained = false;
                return false;
            }
        }
        catch
        {
            isTrained = false;
            return false;
        }
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposedValue)
        {
            if (disposing)
            {
                // TODO: dispose managed state (managed objects)
            }

            // TODO: free unmanaged resources (unmanaged objects) and override finalizer
            // TODO: set large fields to null
            disposedValue = true;
        }
    }

    ~PersonRecognizer()
    {
        // Do not change this code. Put cleanup code in 'Dispose(bool disposing)' method
        Dispose(disposing: false);
    }

    public void Dispose()
    {
        // Do not change this code. Put cleanup code in 'Dispose(bool disposing)' method
        Dispose(disposing: true);
        GC.SuppressFinalize(this);
    }
}

