using Emgu.CV;
using Emgu.CV.CvEnum;
using Emgu.CV.Face;
using Emgu.CV.Structure;
using FaceRecognizer.Interfaces;
using FaceRecognizer.Models;
using System.Drawing;
using static Emgu.CV.Face.FaceRecognizer;

namespace FaceRecognizer.Services;

public class PersonRecognizer : IDisposable, IPersonRecognizer
{
    private readonly CascadeClassifier _classifier;
    private readonly EigenFaceRecognizer _eigenFaceRecognizer;
    private bool isTrained;

    private bool disposedValue;

    public PersonRecognizer(EigenFaceRecognizer eigenFaceRecognizer)
    {
        _classifier = new CascadeClassifier("haarcascade_frontalface_alt.xml");
        _eigenFaceRecognizer = eigenFaceRecognizer;
    }

    public async Task<RecognizedPerson> Recognize(IFormFile image)
    {
        if (!isTrained)
            return new RecognizedPerson(false);

        using MemoryStream stream = new();

        await image.CopyToAsync(stream);
        byte[] bytes = stream.ToArray();
        string localFileName = Path.Combine($"inputImage_{DateTime.UtcNow}", Path.GetExtension(image.FileName));

        if (!File.Exists(localFileName))
            File.Create(localFileName).Dispose();
        await File.WriteAllBytesAsync(localFileName, bytes);
        Image<Bgr, byte> resultImage = new(localFileName);

        Rectangle[] faces = _classifier.DetectMultiScale(resultImage, 1.1, 3, Size.Empty, Size.Empty);

        if (faces.Length <= 0)
            return new RecognizedPerson(false);

        Rectangle face = faces.FirstOrDefault();
        resultImage.ROI = face;

        Image<Gray, Byte> grayFaceResult = resultImage.Convert<Gray, Byte>().Resize(200, 200, Inter.Cubic);
        CvInvoke.EqualizeHist(grayFaceResult, grayFaceResult);

        PredictionResult result = _eigenFaceRecognizer.Predict(grayFaceResult);
        Console.WriteLine(result);

        if (result.Distance > 2000)
            return new RecognizedPerson(false);

        return new RecognizedPerson(true)
        {
            Name = "João Pedro"
        };
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

    // TODO: override finalizer only if 'Dispose(bool disposing)' has code to free unmanaged resources
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
