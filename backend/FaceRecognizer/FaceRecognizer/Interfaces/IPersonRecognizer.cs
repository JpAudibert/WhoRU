using FaceRecognizer.Models;

namespace FaceRecognizer.Interfaces;

public interface IPersonRecognizer
{
    Task<RecognizedPerson> Recognize(IFormFile file);
    Task SaveImagesForTraining(List<IFormFile> images, string personName);
    bool TrainAlgorithm();
}