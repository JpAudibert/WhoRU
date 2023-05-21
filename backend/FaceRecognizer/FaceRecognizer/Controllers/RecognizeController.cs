using FaceRecognizer.Interfaces;
using FaceRecognizer.Models;
using Microsoft.AspNetCore.Mvc;

namespace FaceRecognizer.Controllers;

[ApiController]
[Route("api/v1")]
public class RecognizeController : Controller
{
    private IPersonRecognizer recognizer;

    public RecognizeController(IPersonRecognizer recognizer)
    {
        this.recognizer = recognizer;
    }

    [HttpPost]
    [Route("recognize")]
    public async Task<IActionResult> RecognizePerson([FromForm] IFormFile image)
    {
        RecognizedPerson person = await recognizer.Recognize(image);

        if (!person.IsRecognized)
            return BadRequest(person);

        return Ok(person);
    }

    [HttpPost]
    [Route("train")]
    public async Task<IActionResult> TrainEngine([FromForm] List<IFormFile> images, [FromForm] string name)
    {
        await recognizer.SaveImagesForTraining(images, name);
        return Ok(new { message = "Everything OK" });
    }
}
